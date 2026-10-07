import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Stage3Database, Stage3Sql } from "./client.js";
import { assertLocalDatabase } from "./local-identity.js";

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

export async function migrateSyntheticYucDatabase(sql: Stage3Sql): Promise<void> {
  const text = await readFile(
    new URL("../stage5-migrations/0001_yuc_synthetic.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
  });
}

export async function rollbackSyntheticYucDatabase(sql: Stage3Sql): Promise<void> {
  const text = await readFile(
    new URL("../stage5-migrations/0001_yuc_synthetic.down.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
  });
}

export async function migrateReviewMappedDatabase(sql: Stage3Sql): Promise<void> {
  await assertLocalDatabase(sql, "synthetic-test");
  const text = await readFile(
    new URL("../stage5-migrations/0002_review_mapped.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
  });
}

export async function rollbackReviewMappedDatabase(sql: Stage3Sql): Promise<void> {
  await assertLocalDatabase(sql, "synthetic-test");
  const text = await readFile(
    new URL("../stage5-migrations/0002_review_mapped.down.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
  });
}

export async function migrateRealReviewDatabase(
  sql: Stage3Sql,
  expectedName: string,
): Promise<void> {
  await assertLocalDatabase(sql, "real-local", expectedName);
  const text = await readFile(
    new URL("../stage5-migrations/0003_real_review.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
  });
}

export async function rollbackRealReviewDatabase(
  sql: Stage3Sql,
  expectedName: string,
): Promise<void> {
  await assertLocalDatabase(sql, "real-local", expectedName);
  const text = await readFile(
    new URL("../stage5-migrations/0003_real_review.down.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
  });
}
