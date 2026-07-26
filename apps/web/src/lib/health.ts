import type { AppEnvironment } from "@menghuan/config";

export const WEB_SERVICE_NAME = "menghuan-web";
export const STAGE_NUMBER = "1";
export const APP_VERSION = "0.1.0";

export interface WebHealthResponse {
  status: "ok";
  service: typeof WEB_SERVICE_NAME;
  stage: typeof STAGE_NUMBER;
  environment: AppEnvironment;
  timestamp: string;
  version: string;
}

export function createWebHealthResponse(
  environment: AppEnvironment,
  now: Date = new Date(),
  version: string = APP_VERSION,
): WebHealthResponse {
  return {
    status: "ok",
    service: WEB_SERVICE_NAME,
    stage: STAGE_NUMBER,
    environment,
    timestamp: now.toISOString(),
    version,
  };
}
