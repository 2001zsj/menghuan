import type { AppEnvironment } from "@menghuan/config";

export const WORKER_SERVICE_NAME = "menghuan-sync-worker";
export const STAGE_NUMBER = "1";

export interface WorkerHealthResponse {
  status: "ok";
  service: typeof WORKER_SERVICE_NAME;
  stage: typeof STAGE_NUMBER;
  environment: AppEnvironment;
}

export function createWorkerHealthResponse(environment: AppEnvironment): WorkerHealthResponse {
  return {
    status: "ok",
    service: WORKER_SERVICE_NAME,
    stage: STAGE_NUMBER,
    environment,
  };
}
