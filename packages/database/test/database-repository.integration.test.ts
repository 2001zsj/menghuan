import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FixtureAnimeRepository, stage3AnimeFixture, type AnimeRepository } from "@menghuan/domain";
import { eq } from "drizzle-orm";
import { defineAnimeRepositoryContract } from "../../domain/test/repository-contract.js";
import { createDatabaseClient, type Stage3DatabaseClient } from "../src/client.js";
import { DatabaseAnimeRepository } from "../src/database-anime-repository.js";
import { migrateStage3Database, rollbackStage3DatabaseForTest } from "../src/migrations.js";
import { anime, episodes } from "../src/schema.js";
import { seedStage3Fixture } from "../src/seed.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("test:database必须提供隔离PostgreSQL的TEST_DATABASE_URL");
}

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let migrationsSchema = `menghuan_drizzle_${suffix}`;
let client: Stage3DatabaseClient;
let repository: AnimeRepository;

const businessTables = [
  "anime",
  "seasons",
  "anime_seasons",
  "broadcast_info",
  "episodes",
  "anime_staff_credits",
  "anime_cast_credits",
  "anime_resource_categories",
] as const;

const stage3Enums = [
  "anime_media_type",
  "anime_release_status",
  "data_status",
  "season_quarter",
  "season_type",
  "anime_season_relation_type",
  "broadcast_type",
  "broadcast_state",
  "weekday",
  "episode_type",
  "episode_publication_status",
  "resource_category",
] as const;

async function assertFreshPublicSchema(databaseClient: Stage3DatabaseClient): Promise<void> {
  const existingTables = await databaseClient.sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${databaseClient.sql.array([...businessTables])})
    order by table_name
  `;
  const existingEnums = await databaseClient.sql<{ typname: string }[]>`
    select typname
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and typname = any(${databaseClient.sql.array([...stage3Enums])})
    order by typname
  `;

  if (existingTables.length > 0 || existingEnums.length > 0) {
    throw new Error(
      `TEST_DATABASE_URL must point to a fresh database; found public tables=${existingTables
        .map((row) => row.table_name)
        .join(",")} enums=${existingEnums.map((row) => row.typname).join(",")}`,
    );
  }
}

beforeAll(async () => {
  client = createDatabaseClient(testDatabaseUrl, {
    maxConnections: 1,
    applicationName: "menghuan-stage3-integration",
  });
  await client.sql.unsafe("set search_path to public");
  await assertFreshPublicSchema(client);
  await migrateStage3Database(client.db, { migrationsSchema });
  await seedStage3Fixture(client.db);
  repository = new DatabaseAnimeRepository(client.db);
});

afterAll(async () => {
  if (!client) return;
  try {
    await rollbackStage3DatabaseForTest(client.sql);
  } catch {
    // Migration may have failed before all objects existed; preserve the original failure.
  }
  try {
    await client.sql.unsafe(`drop schema if exists "${migrationsSchema}" cascade`);
  } finally {
    await client.close();
  }
});

defineAnimeRepositoryContract("database", () => repository);

describe("stage 3 database integration", () => {
  it("creates the eight required tables and their foreign keys", async () => {
    const rows = await client.sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    expect(rows.map((row) => row.table_name)).toEqual([
      "anime",
      "anime_cast_credits",
      "anime_resource_categories",
      "anime_seasons",
      "anime_staff_credits",
      "broadcast_info",
      "episodes",
      "seasons",
    ]);

    const foreignKeys = await client.sql<{ count: string }[]>`
      select count(*)::text as count
      from information_schema.table_constraints
      where constraint_schema = 'public'
        and constraint_type = 'FOREIGN KEY'
    `;
    expect(Number(foreignKeys[0]?.count)).toBe(7);
  });

  it("re-running migrations and seed is safe and idempotent", async () => {
    await migrateStage3Database(client.db, { migrationsSchema });
    await seedStage3Fixture(client.db);
    await seedStage3Fixture(client.db);

    const records = await repository.listAnime();
    expect(records).toHaveLength(stage3AnimeFixture.length);
    expect(new Set(records.map((record) => record.anime.id)).size).toBe(records.length);
  });

  it("matches the fixture repository business content", async () => {
    const fixtureRepository = new FixtureAnimeRepository();
    const [fixture, database] = await Promise.all([
      fixtureRepository.listAnime(),
      repository.listAnime(),
    ]);
    expect(database).toEqual(fixture);
    expect(database.map((item) => item.anime.slug)).toEqual(fixture.map((item) => item.anime.slug));
    expect(database.find((item) => item.anime.id === "mock-silent-orbit")?.broadcast).toMatchObject(
      {
        sourceTimezone: null,
        normalizedStartAt: null,
      },
    );
    expect(JSON.stringify(database)).not.toMatch(/https?:\/\/|yuc|agefans|bangumi|bilibili/i);
  });

  it("enforces slug uniqueness and episode foreign keys", async () => {
    const base = stage3AnimeFixture[0]!.anime;
    await expect(
      client.db.insert(anime).values({
        ...base,
        id: "mock-duplicate-slug-check",
      }),
    ).rejects.toBeDefined();

    await expect(
      client.db.insert(episodes).values({
        ...stage3AnimeFixture[0]!.episodes[0]!,
        id: "episode-missing-anime-check",
        animeId: "mock-missing-anime",
      }),
    ).rejects.toBeDefined();

    await expect(
      client.db.insert(episodes).values({
        ...stage3AnimeFixture[0]!.episodes[0]!,
        id: "episode-duplicate-sort-check",
      }),
    ).rejects.toBeDefined();
  });

  it("rolls back failed transactions without partial business data", async () => {
    await expect(
      client.db.transaction(async (tx) => {
        const base = stage3AnimeFixture[0]!.anime;
        await tx.insert(anime).values({
          ...base,
          id: "mock-rollback-check",
          slug: "rollback-check",
        });
        throw new Error("intentional rollback");
      }),
    ).rejects.toThrow("intentional rollback");

    const rows = await client.db
      .select({ id: anime.id })
      .from(anime)
      .where(eq(anime.id, "mock-rollback-check"));
    expect(rows).toHaveLength(0);
  });

  it("rolls back failed DDL transactions without partial schema objects", async () => {
    await expect(
      client.sql.begin(async (transaction) => {
        await transaction.unsafe('create table "migration_failure_probe" ("id" text primary key)');
        throw new Error("intentional migration rollback");
      }),
    ).rejects.toThrow("intentional migration rollback");

    const rows = await client.sql<{ table_name: string | null }[]>`
      select to_regclass('public.migration_failure_probe')::text as table_name
    `;
    expect(rows[0]?.table_name).toBeNull();
  });
});

describe.sequential("stage 3 migration rollback", () => {
  it("applies down SQL in public and can migrate again", async () => {
    await rollbackStage3DatabaseForTest(client.sql);

    const afterDown = await client.sql<{ table_name: string | null; enum_name: string | null }[]>`
      select
        to_regclass('public.anime')::text as table_name,
        to_regtype('public.anime_media_type')::text as enum_name
    `;
    expect(afterDown[0]?.table_name).toBeNull();
    expect(afterDown[0]?.enum_name).toBeNull();

    await client.sql.unsafe(`drop schema if exists "${migrationsSchema}" cascade`);
    await migrateStage3Database(client.db, { migrationsSchema });
    const remigrated = await client.sql<{ table_name: string | null; enum_name: string | null }[]>`
      select
        to_regclass('public.anime')::text as table_name,
        to_regtype('public.anime_media_type')::text as enum_name
    `;
    expect(remigrated[0]?.table_name).toBe("anime");
    expect(remigrated[0]?.enum_name).toBe("anime_media_type");
  });

  it("rolls back the real Drizzle migration when a late migration statement fails", async () => {
    await rollbackStage3DatabaseForTest(client.sql);
    await client.sql.unsafe(`drop schema if exists "${migrationsSchema}" cascade`);

    const emptyTables = await client.sql<{ count: string }[]>`
      select count(*)::text as count
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any(${client.sql.array([...businessTables])})
    `;
    const emptyEnums = await client.sql<{ count: string }[]>`
      select count(*)::text as count
      from pg_type
      join pg_namespace on pg_namespace.oid = pg_type.typnamespace
      where pg_namespace.nspname = 'public'
        and typname = any(${client.sql.array([...stage3Enums])})
    `;
    expect(Number(emptyTables[0]?.count)).toBe(0);
    expect(Number(emptyEnums[0]?.count)).toBe(0);

    await client.sql.unsafe(`
      create table public.migration_failure_trigger (
        id integer primary key
      )
    `);
    await client.sql.unsafe(`
      create unique index seasons_year_quarter_type_unique
      on public.migration_failure_trigger(id)
    `);

    const probe = await client.sql<{ table_name: string | null; index_name: string | null }[]>`
      select
        to_regclass('public.migration_failure_trigger')::text as table_name,
        to_regclass('public.seasons_year_quarter_type_unique')::text as index_name
    `;
    expect(probe[0]?.table_name).toBe("migration_failure_trigger");
    expect(probe[0]?.index_name).toBe("seasons_year_quarter_type_unique");

    const failureMigrationsSchema = `menghuan_drizzle_failure_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    let migrationError: unknown;
    try {
      await migrateStage3Database(client.db, {
        migrationsSchema: failureMigrationsSchema,
      });
    } catch (error) {
      migrationError = error;
    }

    expect(migrationError).toBeDefined();
    const migrationErrorRecord = migrationError as {
      code?: string;
      message?: string;
      cause?: { code?: string; message?: string };
    };
    const postgresError = migrationErrorRecord.cause ?? migrationErrorRecord;
    expect(postgresError.code).toBe("42P07");
    expect(`${postgresError.code ?? ""} ${postgresError.message ?? ""}`).toMatch(
      /duplicate|already exists|relation/i,
    );

    const failureObjects = await client.sql<
      {
        trigger_table: string | null;
        conflict_index: string | null;
        anime_table: string | null;
        anime_enum: string | null;
      }[]
    >`
      select
        to_regclass('public.migration_failure_trigger')::text as trigger_table,
        to_regclass('public.seasons_year_quarter_type_unique')::text as conflict_index,
        to_regclass('public.anime')::text as anime_table,
        to_regtype('public.anime_media_type')::text as anime_enum
    `;
    expect(failureObjects[0]?.trigger_table).toBe("migration_failure_trigger");
    expect(failureObjects[0]?.conflict_index).toBe("seasons_year_quarter_type_unique");
    expect(failureObjects[0]?.anime_table).toBeNull();
    expect(failureObjects[0]?.anime_enum).toBeNull();

    const remainingTables = await client.sql<{ count: string }[]>`
      select count(*)::text as count
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any(${client.sql.array([...businessTables])})
    `;
    const remainingEnums = await client.sql<{ count: string }[]>`
      select count(*)::text as count
      from pg_type
      join pg_namespace on pg_namespace.oid = pg_type.typnamespace
      where pg_namespace.nspname = 'public'
        and typname = any(${client.sql.array([...stage3Enums])})
    `;
    expect(Number(remainingTables[0]?.count)).toBe(0);
    expect(Number(remainingEnums[0]?.count)).toBe(0);

    const bookkeeping = await client.sql<
      {
        schema_exists: boolean;
        table_exists: boolean;
      }[]
    >`
      select
        exists (
          select 1
          from pg_namespace
          where nspname = ${failureMigrationsSchema}
        ) as schema_exists,
        exists (
          select 1
          from information_schema.tables
          where table_schema = ${failureMigrationsSchema}
            and table_name = '__drizzle_migrations'
        ) as table_exists
    `;
    expect(bookkeeping[0]?.schema_exists).toBe(true);
    if (bookkeeping[0]?.table_exists) {
      const records = await client.sql.unsafe<{ count: string }[]>(
        `select count(*)::text as count from "${failureMigrationsSchema}"."__drizzle_migrations"`,
      );
      expect(Number(records[0]?.count)).toBe(0);
    }

    await client.sql.unsafe("drop table if exists public.migration_failure_trigger cascade");
    await client.sql.unsafe(`drop schema if exists "${failureMigrationsSchema}" cascade`);
    const cleanedProbe = await client.sql<
      { table_name: string | null; index_name: string | null }[]
    >`
      select
        to_regclass('public.migration_failure_trigger')::text as table_name,
        to_regclass('public.seasons_year_quarter_type_unique')::text as index_name
    `;
    expect(cleanedProbe[0]?.table_name).toBeNull();
    expect(cleanedProbe[0]?.index_name).toBeNull();

    migrationsSchema = failureMigrationsSchema;
    await migrateStage3Database(client.db, { migrationsSchema });

    const recovered = await client.sql<{ table_count: string; enum_count: string }[]>`
      select
        (
          select count(*)
          from information_schema.tables
          where table_schema = 'public'
            and table_name = any(${client.sql.array([...businessTables])})
        )::text as table_count,
        (
          select count(*)
          from pg_type
          join pg_namespace on pg_namespace.oid = pg_type.typnamespace
          where pg_namespace.nspname = 'public'
            and typname = any(${client.sql.array([...stage3Enums])})
        )::text as enum_count
    `;
    expect(Number(recovered[0]?.table_count)).toBe(8);
    expect(Number(recovered[0]?.enum_count)).toBe(12);
    expect(
      (
        await client.sql<{ table_name: string | null; enum_name: string | null }[]>`
        select
          to_regclass('public.anime')::text as table_name,
          to_regtype('public.anime_media_type')::text as enum_name
      `
      )[0],
    ).toEqual({ table_name: "anime", enum_name: "anime_media_type" });
  });
});
