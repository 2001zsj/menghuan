import {
  animePageDataSchema,
  animeSlugSchema,
  type AnimePageData,
  type AnimeRepository,
} from "@menghuan/domain";
import { asc, desc, eq } from "drizzle-orm";
import type { Stage3Database } from "./client.js";
import {
  anime,
  animeCastCredits,
  animeResourceCategories,
  animeSeasons,
  animeStaffCredits,
  broadcastInfo,
  episodes,
  seasons,
} from "./schema.js";

function normalizeIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`数据库时间格式无效：${value}`);
  return parsed.toISOString();
}

function normalizeNullableIso(value: string | null): string | null {
  return value === null ? null : normalizeIso(value);
}

export class DatabaseAnimeRepository implements AnimeRepository {
  constructor(private readonly db: Stage3Database) {}

  async listAnime(): Promise<AnimePageData[]> {
    const rows = await this.db
      .select({ id: anime.id })
      .from(anime)
      .orderBy(asc(anime.createdAt), asc(anime.id));

    return Promise.all(rows.map((row) => this.requireAnimeById(row.id)));
  }

  async getAnimeBySlug(slug: string): Promise<AnimePageData | null> {
    const parsed = animeSlugSchema.safeParse(slug);
    if (!parsed.success) return null;

    const [row] = await this.db
      .select({ id: anime.id })
      .from(anime)
      .where(eq(anime.slug, parsed.data))
      .limit(1);

    return row ? this.loadAnimeById(row.id) : null;
  }

  async getAnimeById(id: string): Promise<AnimePageData | null> {
    return this.loadAnimeById(id);
  }

  async listAnimeSlugs(): Promise<string[]> {
    const rows = await this.db
      .select({ slug: anime.slug })
      .from(anime)
      .orderBy(asc(anime.createdAt), asc(anime.id));
    return rows.map((row) => row.slug);
  }

  private async requireAnimeById(id: string): Promise<AnimePageData> {
    const record = await this.loadAnimeById(id);
    if (!record) throw new Error(`数据库中的动漫记录在读取详情时消失：${id}`);
    return record;
  }

  private async loadAnimeById(id: string): Promise<AnimePageData | null> {
    const [animeRow] = await this.db.select().from(anime).where(eq(anime.id, id)).limit(1);
    if (!animeRow) return null;

    const [seasonRows, broadcastRows, episodeRows, staffRows, castRows, resourceRows] =
      await Promise.all([
        this.db
          .select({ relation: animeSeasons, season: seasons })
          .from(animeSeasons)
          .innerJoin(seasons, eq(animeSeasons.seasonId, seasons.id))
          .where(eq(animeSeasons.animeId, id))
          .orderBy(desc(animeSeasons.isPrimary), asc(seasons.year), asc(seasons.quarter)),
        this.db
          .select()
          .from(broadcastInfo)
          .where(eq(broadcastInfo.animeId, id))
          .orderBy(desc(broadcastInfo.isPrimary), asc(broadcastInfo.id)),
        this.db
          .select()
          .from(episodes)
          .where(eq(episodes.animeId, id))
          .orderBy(asc(episodes.sortValue), asc(episodes.id)),
        this.db
          .select()
          .from(animeStaffCredits)
          .where(eq(animeStaffCredits.animeId, id))
          .orderBy(asc(animeStaffCredits.sortOrder), asc(animeStaffCredits.id)),
        this.db
          .select()
          .from(animeCastCredits)
          .where(eq(animeCastCredits.animeId, id))
          .orderBy(asc(animeCastCredits.sortOrder), asc(animeCastCredits.id)),
        this.db
          .select()
          .from(animeResourceCategories)
          .where(eq(animeResourceCategories.animeId, id))
          .orderBy(asc(animeResourceCategories.sortOrder), asc(animeResourceCategories.category)),
      ]);

    const primarySeason = seasonRows[0] ?? null;
    const primaryBroadcast = broadcastRows[0] ?? null;

    return animePageDataSchema.parse({
      anime: {
        ...animeRow,
        createdAt: normalizeIso(animeRow.createdAt),
        updatedAt: normalizeIso(animeRow.updatedAt),
      },
      season: primarySeason
        ? {
            id: primarySeason.season.id,
            year: primarySeason.season.year,
            quarter: primarySeason.season.quarter,
            label: primarySeason.season.label,
            startDate: primarySeason.season.startDate,
            endDate: primarySeason.season.endDate,
            referenceTimezone: primarySeason.season.referenceTimezone,
            seasonType: primarySeason.season.seasonType,
            dataStatus: primarySeason.season.dataStatus,
          }
        : null,
      animeSeason: primarySeason
        ? {
            ...primarySeason.relation,
            createdAt: normalizeIso(primarySeason.relation.createdAt),
          }
        : null,
      broadcast: primaryBroadcast
        ? {
            ...primaryBroadcast,
            normalizedStartAt: normalizeNullableIso(primaryBroadcast.normalizedStartAt),
            createdAt: normalizeIso(primaryBroadcast.createdAt),
            updatedAt: normalizeIso(primaryBroadcast.updatedAt),
          }
        : null,
      episodes: episodeRows.map((episode) => ({
        ...episode,
        normalizedReleaseAt: normalizeNullableIso(episode.normalizedReleaseAt),
        createdAt: normalizeIso(episode.createdAt),
        updatedAt: normalizeIso(episode.updatedAt),
      })),
      staffCredits: staffRows.map((credit) => ({
        ...credit,
        createdAt: normalizeIso(credit.createdAt),
      })),
      castCredits: castRows.map((credit) => ({
        ...credit,
        createdAt: normalizeIso(credit.createdAt),
      })),
      resourceCategories: resourceRows.map((row) => row.category),
    });
  }
}
