import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Stage3Database, Stage3Sql } from "./client.js";

export const STAGE3_MIGRATIONS_FOLDER = fileURLToPath(new URL("../drizzle", import.meta.url));
const STAGE3_DOWN_MIGRATION = fileURLToPath(
  new URL("../drizzle/down/0000_stage3_foundation.down.sql", import.meta.url),
);

export async function migrateStage3Database(
  db: Stage3Database,
  options: { migrationsSchema?: string; migrationsTable?: string } = {},
): Promise<void> {
  await migrate(db, {
    migrationsFolder: STAGE3_MIGRATIONS_FOLDER,
    migrationsSchema: options.migrationsSchema ?? "drizzle",
    migrationsTable: options.migrationsTable ?? "__drizzle_migrations",
  });
}

export async function rollbackStage3DatabaseForTest(sql: Stage3Sql): Promise<void> {
  const downSql = await readFile(STAGE3_DOWN_MIGRATION, "utf8");
  await sql.unsafe(downSql);
}
