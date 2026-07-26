import { z } from "zod";

export const APP_ENV_VALUES = ["local", "preview", "production"] as const;
export const LOG_LEVEL_VALUES = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

const environmentSchema = z.object({
  APP_ENV: z.enum(APP_ENV_VALUES).default("local"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(LOG_LEVEL_VALUES).default("info"),
});

export type Environment = z.infer<typeof environmentSchema>;
export type AppEnvironment = Environment["APP_ENV"];
export type LogLevel = Environment["LOG_LEVEL"];

export class EnvironmentValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    const details = issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");

    super(`环境变量配置无效：${details}`);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

export function parseEnvironment(input: NodeJS.ProcessEnv = {}): Environment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    throw new EnvironmentValidationError(result.error.issues);
  }

  return result.data;
}

export function getEnvironment(): Environment {
  return parseEnvironment(process.env);
}
