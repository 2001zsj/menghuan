import { runWorkerHealth } from "./run-health.js";

process.exitCode = runWorkerHealth(process.env, console);
