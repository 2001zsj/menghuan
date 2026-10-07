import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { RequestOptions } from "node:https";
import { createNodeYucWire, YucNodeAcquisition, type YucConnectionMode } from "./yuc-fetch";

const mocked = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("node:https", async (original) => ({
  ...(await original<typeof import("node:https")>()),
  request: mocked.request,
}));
beforeEach(() => {
  mocked.request.mockReset();
  mocked.request.mockImplementation(
    (_url: string, _options: RequestOptions, callback: (response: unknown) => void) => {
      const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
      req.destroy = vi.fn();
      req.end = () => {
        const res = Object.assign(Readable.from([Buffer.from("<html>synthetic only</html>")]), {
          statusCode: 200,
          headers: { "content-type": "text/html" },
        });
        callback(res);
      };
      return req;
    },
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("explicit Node connection mode", () => {
  it("rejects missing mode rather than silently choosing a path", () => {
    expect(() => createNodeYucWire()).toThrow("Explicit connection mode is required");
    expect(mocked.request).not.toHaveBeenCalled();
  });
  it.each([null, {}, { connectionMode: "auto" }, { connectionMode: "DIRECT" }])(
    "rejects invalid runtime config %j",
    (config) => {
      expect(() => createNodeYucWire(config as { connectionMode: YucConnectionMode })).toThrow();
      expect(mocked.request).not.toHaveBeenCalled();
    },
  );
  it.each(["approved-proxy", "direct"] as const)(
    "keeps %s disabled by default",
    async (connectionMode) => {
      const acquisition = new YucNodeAcquisition({ wire: createNodeYucWire({ connectionMode }) });
      await expect(
        acquisition.fetch("https://yuc.wiki/202610/", new AbortController().signal),
      ).rejects.toMatchObject({ reason: "disabled" });
      expect(mocked.request).not.toHaveBeenCalled();
    },
  );
  it.each(["approved-proxy", "direct"] as const)(
    "makes one strict GET with explicit %s agent despite hostile proxy env",
    async (connectionMode) => {
      vi.stubEnv("HTTPS_PROXY", "http://synthetic.invalid:3210");
      vi.stubEnv("NO_PROXY", "*");
      vi.stubEnv("NODE_USE_ENV_PROXY", "1");
      const acquisition = new YucNodeAcquisition({
        wire: createNodeYucWire({ connectionMode }),
        enabled: true,
      });
      const result = await acquisition.fetch(
        "https://yuc.wiki/202610/",
        new AbortController().signal,
      );
      expect(result.body).toBe("<html>synthetic only</html>");
      await expect(
        acquisition.fetch("https://yuc.wiki/202610/", new AbortController().signal),
      ).rejects.toMatchObject({ reason: "budget-exhausted" });
      expect(mocked.request).toHaveBeenCalledTimes(1);
      const [url, options] = mocked.request.mock.calls[0]!;
      expect(url).toBe("https://yuc.wiki/202610/");
      expect(options).toMatchObject({ method: "GET", rejectUnauthorized: true });
      expect(options.agent.options).toMatchObject({
        rejectUnauthorized: true,
        maxSockets: 1,
        keepAlive: false,
      });
      expect(options.agent.options.proxyEnv).toEqual(
        connectionMode === "direct"
          ? {}
          : {
              HTTPS_PROXY: "http://127.0.0.1:10090",
              https_proxy: "http://127.0.0.1:10090",
              NO_PROXY: "",
              no_proxy: "",
            },
      );
      expect(process.env.HTTPS_PROXY).toBe("http://synthetic.invalid:3210");
    },
  );
  it("blocks certificate verification disable without requesting", () => {
    vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", "0");
    expect(() => createNodeYucWire({ connectionMode: "direct" })).toThrow(
      "Strict TLS verification is required",
    );
    expect(mocked.request).not.toHaveBeenCalled();
  });
  it.each(["approved-proxy", "direct"] as const)(
    "never falls back or retries %s on TLS failure, exposing only safe code",
    async (connectionMode) => {
      mocked.request.mockImplementation(() => {
        const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
        req.destroy = vi.fn();
        req.end = () =>
          req.emit(
            "error",
            Object.assign(new Error("synthetic-secret-credential"), { code: "CERT_HAS_EXPIRED" }),
          );
        return req;
      });
      const acquisition = new YucNodeAcquisition({
        wire: createNodeYucWire({ connectionMode }),
        enabled: true,
      });
      await expect(
        acquisition.fetch("https://yuc.wiki/202610/", new AbortController().signal),
      ).rejects.toMatchObject({
        reason: "tls-error",
        nodeCode: "CERT_HAS_EXPIRED",
        message: "YUC acquisition stopped: tls-error",
        httpStatus: null,
      });
      await expect(
        acquisition.fetch("https://yuc.wiki/202610/", new AbortController().signal),
      ).rejects.toMatchObject({ reason: "circuit-open" });
      expect(mocked.request).toHaveBeenCalledTimes(1);
    },
  );
});
