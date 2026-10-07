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
    MENGHUAN_PREVIEW_REVIEW_MODE: z.enum(["off", "synthetic-readonly"]).default("off"),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    MENGHUAN_REVIEW_MODE: z.enum(["off", "synthetic-test"]).default("off"),
    MENGHUAN_REVIEW_DATABASE_URL: optionalDatabaseUrlSchema,
    MENGHUAN_REAL_REVIEW_MODE: z.enum(["off", "local-evaluation"]).default("off"),
    MENGHUAN_REAL_REVIEW_DATABASE_URL: optionalDatabaseUrlSchema,
    MENGHUAN_REAL_REVIEW_SESSION_ID: z.uuid().optional(),
    MENGHUAN_SYNTHETIC_MODE: z.enum(["off", "mock", "database"]).default("off"),
    MENGHUAN_SYNTHETIC_DATABASE_URL: optionalDatabaseUrlSchema,
    MENGHUAN_DATA_REPOSITORY: z.enum(DATA_REPOSITORY_VALUES).default("mock"),
    DATABASE_URL: optionalDatabaseUrlSchema,
  })
  .superRefine((value, context) => {
    if (value.MENGHUAN_PREVIEW_REVIEW_MODE !== "off") {
      if (
        value.APP_ENV !== "preview" ||
        (value.VERCEL_ENV !== undefined && value.VERCEL_ENV !== "preview") ||
        value.MENGHUAN_REAL_REVIEW_MODE !== "off" ||
        value.MENGHUAN_REVIEW_MODE !== "off" ||
        value.MENGHUAN_SYNTHETIC_MODE !== "off" ||
        value.MENGHUAN_DATA_REPOSITORY !== "mock" ||
        value.DATABASE_URL ||
        value.MENGHUAN_REAL_REVIEW_DATABASE_URL ||
        value.MENGHUAN_REVIEW_DATABASE_URL ||
        value.MENGHUAN_SYNTHETIC_DATABASE_URL ||
        value.MENGHUAN_REAL_REVIEW_SESSION_ID
      )
        context.addIssue({
          code: "custom",
          path: ["MENGHUAN_PREVIEW_REVIEW_MODE"],
          message:
            "Synthetic Preview must be isolated, preview-only and database-free; local evaluation stays closed",
        });
    }
    if (value.MENGHUAN_REAL_REVIEW_MODE !== "off") {
      const u = value.MENGHUAN_REAL_REVIEW_DATABASE_URL
        ? new URL(value.MENGHUAN_REAL_REVIEW_DATABASE_URL)
        : null;
      if (
        value.APP_ENV !== "local" ||
        value.MENGHUAN_REVIEW_MODE !== "off" ||
        value.MENGHUAN_SYNTHETIC_MODE !== "off" ||
        !value.MENGHUAN_REAL_REVIEW_SESSION_ID ||
        !u ||
        !["127.0.0.1", "[::1]"].includes(u.hostname) ||
        !/^\/menghuan_stage5_test_real_[a-z0-9_]+$/.test(u.pathname) ||
        u.search ||
        u.hash
      )
        context.addIssue({
          code: "custom",
          message:
            "Real evaluation requires explicit local isolated scope; all synthetic modes off",
        });
    }
    if (value.MENGHUAN_REVIEW_MODE !== "off") {
      const url = value.MENGHUAN_REVIEW_DATABASE_URL
        ? new URL(value.MENGHUAN_REVIEW_DATABASE_URL)
        : null;
      if (
        value.APP_ENV !== "local" ||
        value.MENGHUAN_SYNTHETIC_MODE !== "off" ||
        !url ||
        !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
        !/^\/menghuan_stage5_test_(?:mapping|real)_[a-z0-9_]+$/.test(url.pathname)
      ) {
        context.addIssue({
          code: "custom",
          path: ["MENGHUAN_REVIEW_MODE"],
          message: "合成审核必须显式使用local独立mapping测试库，且旧合成模式关闭",
        });
      }
    }
    if (value.MENGHUAN_SYNTHETIC_MODE !== "off" && value.APP_ENV !== "local") {
      context.addIssue({
        code: "custom",
        path: ["MENGHUAN_SYNTHETIC_MODE"],
        message: "合成集成仅允许local环境",
      });
    }
    if (value.MENGHUAN_SYNTHETIC_MODE === "database") {
      const url = value.MENGHUAN_SYNTHETIC_DATABASE_URL
        ? new URL(value.MENGHUAN_SYNTHETIC_DATABASE_URL)
        : null;
      if (
        !url ||
        !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
        !/^\/menghuan_stage5_test_[a-z0-9_]+$/.test(url.pathname)
      ) {
        context.addIssue({
          code: "custom",
          path: ["MENGHUAN_SYNTHETIC_DATABASE_URL"],
          message: "必须明确提供本批独立本机测试库",
        });
      }
    }
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
