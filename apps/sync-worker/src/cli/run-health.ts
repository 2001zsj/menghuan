import { EnvironmentValidationError, parseEnvironment, type Environment } from "@menghuan/config";
import { createWorkerHealthResponse } from "../health.js";

export interface WorkerHealthOutput {
  log(message: string): void;
  error(message: string): void;
}

export function runWorkerHealth(input: NodeJS.ProcessEnv, output: WorkerHealthOutput): number {
  try {
    const environment: Environment = parseEnvironment(input);
    output.log(JSON.stringify(createWorkerHealthResponse(environment.APP_ENV)));
    return 0;
  } catch (error) {
    const message =
      error instanceof EnvironmentValidationError
        ? error.message
        : "同步Worker健康检查发生未知配置错误。";

    output.error(
      JSON.stringify({
        status: "error",
        service: "menghuan-sync-worker",
        stage: "1",
        message,
      }),
    );
    return 1;
  }
}
