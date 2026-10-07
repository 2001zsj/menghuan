import { describe, expect, it, vi } from "vitest";
import {
  InMemoryYucCandidateStore,
  YucAdapter,
  parseYucHtml,
} from "../../../../packages/domain/src/sources/yuc.js";
import { YucNodeAcquisition, type WireResponse } from "./yuc-fetch";

const page = "https://yuc.wiki/202610/";
const signal = () => new AbortController().signal;
function response(status = 200, text = "<html>synthetic</html>"): WireResponse {
  return {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: (async function* () {
      yield Buffer.from(text);
    })(),
    close: vi.fn(),
  };
}

describe("Node YUC acquisition: synthetic wire only", () => {
  it("defaults disabled and never invokes wire", async () => {
    const wire = vi.fn();
    const transport = new YucNodeAcquisition({ wire });
    await expect(transport.fetch(page, signal())).rejects.toMatchObject({ reason: "disabled" });
    expect(wire).not.toHaveBeenCalled();
  });

  it.each([
    "https://yuc.wiki/202607",
    "https://user@yuc.wiki/202610/",
    page + "?x=1",
    "http://yuc.wiki/202610/",
  ])("rejects non-approved URL %s", async (url) => {
    const wire = vi.fn();
    const transport = new YucNodeAcquisition({ wire, enabled: true });
    await expect(transport.fetch(url, signal())).rejects.toThrow();
    expect(wire).not.toHaveBeenCalled();
  });

  it("serializes queued callers and enforces a single shared request budget", async () => {
    let active = 0;
    let peak = 0;
    const wire = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      return response();
    });
    const transport = new YucNodeAcquisition({ wire, enabled: true });
    const results = await Promise.allSettled([1, 2, 3].map(() => transport.fetch(page, signal())));
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "rejected"]);
    expect(wire).toHaveBeenCalledTimes(1);
    expect(peak).toBe(1);
  });

  it.each([
    [403, "forbidden"],
    [429, "rate-limited"],
    [302, "http-error"],
    [503, "http-error"],
  ])("stops HTTP %s without retry or redirect", async (status, reason) => {
    const res = response(Number(status));
    const wire = vi.fn(async () => res);
    const transport = new YucNodeAcquisition({ wire, enabled: true });
    const results = await Promise.allSettled([1, 2, 3].map(() => transport.fetch(page, signal())));
    expect(results[0]).toMatchObject({ status: "rejected", reason: { reason } });
    expect(results[1]).toMatchObject({ status: "rejected", reason: { reason: "circuit-open" } });
    expect(wire).toHaveBeenCalledTimes(1);
    expect(res.close).toHaveBeenCalled();
  });

  it("sanitizes TLS errors and never exposes raw endpoint/credential text", async () => {
    const transport = new YucNodeAcquisition({
      enabled: true,
      wire: async () => {
        throw Object.assign(new Error("synthetic-secret"), { code: "CERT_HAS_EXPIRED" });
      },
    });
    await expect(transport.fetch(page, signal())).rejects.toMatchObject({
      reason: "tls-error",
      message: "YUC acquisition stopped: tls-error",
    });
  });

  it("bounds body bytes and closes the stream", async () => {
    const res = response(200, "12345");
    const transport = new YucNodeAcquisition({ wire: async () => res, enabled: true, maxBytes: 4 });
    await expect(transport.fetch(page, signal())).rejects.toMatchObject({ reason: "too-large" });
    expect(res.close).toHaveBeenCalled();
  });

  it.each(["application/json", ""])("rejects non-HTML response %s", async (contentType) => {
    const res = response();
    const transport = new YucNodeAcquisition({
      enabled: true,
      wire: async () => ({ ...res, headers: { "content-type": contentType } }),
    });
    await expect(transport.fetch(page, signal())).rejects.toMatchObject({
      reason: "invalid-response",
    });
  });

  it("times out a wire that ignores cancellation; late response is closed", async () => {
    let finish!: (r: WireResponse) => void;
    const res = response();
    const transport = new YucNodeAcquisition({
      enabled: true,
      timeoutMs: 5,
      wire: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    await expect(transport.fetch(page, signal())).rejects.toMatchObject({ reason: "timeout" });
    finish(res);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(res.close).toHaveBeenCalled();
  });

  it("source shutdown aborts active request and prevents queued requests", async () => {
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const wire = vi.fn(async () => {
      started();
      return await new Promise<WireResponse>(() => {});
    });
    const transport = new YucNodeAcquisition({ enabled: true, wire });
    const results = Promise.allSettled([
      transport.fetch(page, signal()),
      transport.fetch(page, signal()),
    ]);
    await ready;
    transport.setEnabled(false);
    expect((await results).every((r) => r.status === "rejected")).toBe(true);
    expect(wire).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe bounds", () => {
    expect(() => new YucNodeAcquisition({ wire: vi.fn(), budget: 2 })).toThrow();
    expect(() => new YucNodeAcquisition({ wire: vi.fn(), timeoutMs: 20_001 })).toThrow();
  });

  it("r3 adapter remains isolated: acquisition failure does not clear candidates", async () => {
    const store = new InMemoryYucCandidateStore();
    const synthetic =
      '<article data-yuc-entry data-entity-id="node-synthetic-a" data-title="Synthetic only" data-time="25:15"></article>';
    store.stage(parseYucHtml(synthetic, page, "2026-10-02T00:00:00Z")[0]);
    const transport = new YucNodeAcquisition({ enabled: true, wire: async () => response(403) });
    const adapter = new YucAdapter({
      enabled: true,
      sourcePageUrl: page,
      fetcher: transport.fetch,
      policy: { maxRetries: 0 },
    });
    const before = store.listCandidates();
    expect(before).toHaveLength(1);
    expect((await adapter.sync(store)).status).toBe("failed");
    expect(store.listCandidates()).toEqual(before);
  });
});
