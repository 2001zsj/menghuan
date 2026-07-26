import { describe, expect, it, vi } from "vitest";
import { runWorkerHealth } from "./run-health";

describe("runWorkerHealth", () => {
  it("returns zero and writes structured JSON for valid configuration", () => {
    const log = vi.fn();
    const error = vi.fn();

    expect(
      runWorkerHealth(
        {
          APP_ENV: "local",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
          LOG_LEVEL: "info",
        },
        { log, error },
      ),
    ).toBe(0);

    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
      status: "ok",
      service: "menghuan-sync-worker",
      stage: "1",
      environment: "local",
    });
    expect(error).not.toHaveBeenCalled();
  });

  it("returns non-zero and writes a clear error for invalid configuration", () => {
    const log = vi.fn();
    const error = vi.fn();

    expect(runWorkerHealth({ APP_ENV: "invalid" }, { log, error })).toBe(1);
    expect(log).not.toHaveBeenCalled();

    const response = JSON.parse(error.mock.calls[0]?.[0] as string) as {
      status: string;
      message: string;
    };
    expect(response.status).toBe("error");
    expect(response.message).toContain("APP_ENV");
  });
});
