import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  anime,
  animeCastCredits,
  animeResourceCategories,
  animeSeasons,
  animeStaffCredits,
  broadcastInfo,
  episodes,
  seasons,
} from "../src/schema";

const migrationPath = fileURLToPath(
  new URL("../drizzle/0000_stage3_foundation.sql", import.meta.url),
);

describe("stage 3 schema", () => {
  it("contains exactly the eight minimum business tables", () => {
    expect(
      [
        anime,
        seasons,
        animeSeasons,
        broadcastInfo,
        episodes,
        animeStaffCredits,
        animeCastCredits,
        animeResourceCategories,
      ].map(getTableName),
    ).toEqual([
      "anime",
      "seasons",
      "anime_seasons",
      "broadcast_info",
      "episodes",
      "anime_staff_credits",
      "anime_cast_credits",
      "anime_resource_categories",
    ]);
  });

  it("keeps forbidden user, source, Redis, and search structures out of the migration", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).not.toMatch(
      /create table "?(users|accounts|sessions|favorites|viewing_progress|recent_views)/,
    );
    expect(sql).not.toMatch(/source_yuc|source_age|redis|pg_trgm|to_tsvector/);
  });
});
