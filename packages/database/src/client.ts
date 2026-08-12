import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { stage3Schema } from "./schema.js";

export interface DatabaseClientOptions {
  maxConnections?: number;
  prepare?: boolean;
  applicationName?: string;
}

export function createDatabaseClient(databaseUrl: string, options: DatabaseClientOptions = {}) {
  const sql = postgres(databaseUrl, {
    max: options.maxConnections ?? 5,
    prepare: options.prepare ?? false,
    connection: {
      application_name: options.applicationName ?? "menghuan-stage3",
    },
  });
  const db = drizzle(sql, { schema: stage3Schema });

  return {
    sql,
    db,
    async close(): Promise<void> {
      await sql.end({ timeout: 5 });
    },
  };
}

export type Stage3DatabaseClient = ReturnType<typeof createDatabaseClient>;
export type Stage3Database = Stage3DatabaseClient["db"];
export type Stage3Sql = Sql;
