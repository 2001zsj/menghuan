import { describe, expect, it } from "vitest";
import { createWebHealthResponse } from "./health";

describe("createWebHealthResponse", () => {
  it("creates the Stage 1 web health response", () => {
    const now = new Date("2026-07-26T00:00:00.000Z");

    expect(createWebHealthResponse("local", now)).toEqual({
      status: "ok",
      service: "menghuan-web",
      stage: "1",
      environment: "local",
      timestamp: "2026-07-26T00:00:00.000Z",
      version: "0.1.0",
    });
  });
});
