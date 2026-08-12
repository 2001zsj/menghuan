import { z } from "zod";

export const APP_ENV_VALUES = ["local", "preview", "production"] as const;
export const LOG_LEVEL_VALUES = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export const DATA_REPOSITORY_VALUES = ["mock", "database"] as const;

const databaseUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL必须使用postgresql://或postgres://协议",
  );

const optionalDatabaseUrlSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  databaseUrlSchema.optional(),
);

const environmentSchema = z.object({
  APP_ENV: z.enum(APP_ENV_VALUES).default("local"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(LOG_LEVEL_VALUES).default("info"),
});

const serverEnvironmentSchema = environmentSchema
  .extend({
    MENGHUAN_DATA_REPOSITORY: z.enum(DATA_REPOSITORY_VALUES).default("mock"),
    DATABASE_URL: optionalDatabaseUrlSchema,
  })
  .superRefine((value, context) => {
    if (value.MENGHUAN_DATA_REPOSITORY === "database" && !value.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "database模式必须提供合法DATABASE_URL",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
export type AppEnvironment = Environment["APP_ENV"];
export type LogLevel = Environment["LOG_LEVEL"];
export type DataRepositoryMode = ServerEnvironment["MENGHUAN_DATA_REPOSITORY"];

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

function parseWithSchema<T>(schema: z.ZodType<T>, input: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new EnvironmentValidationError(result.error.issues);
  return result.data;
}

export function parseEnvironment(input: NodeJS.ProcessEnv = {}): Environment {
  return parseWithSchema(environmentSchema, input);
}

export function parseServerEnvironment(input: NodeJS.ProcessEnv = {}): ServerEnvironment {
  return parseWithSchema(serverEnvironmentSchema, input);
}

export function requireDatabaseUrl(input: NodeJS.ProcessEnv = process.env): string {
  const result = databaseUrlSchema.safeParse(input.DATABASE_URL);
  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map((issue) => ({ ...issue, path: ["DATABASE_URL", ...issue.path] })),
    );
  }
  return result.data;
}

export function getEnvironment(): Environment {
  return parseEnvironment(process.env);
}

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment(process.env);
}
