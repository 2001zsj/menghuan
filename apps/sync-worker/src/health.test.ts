import { describe, expect, it } from "vitest";
import { createWorkerHealthResponse } from "./health";

describe("createWorkerHealthResponse", () => {
  it("creates the Stage 1 worker health response", () => {
    expect(createWorkerHealthResponse("local")).toEqual({
      status: "ok",
      service: "menghuan-sync-worker",
      stage: "1",
      environment: "local",
    });
  });
});
