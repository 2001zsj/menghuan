import {
  ANIME_MEDIA_TYPES,
  ANIME_RELEASE_STATUSES,
  ANIME_SEASON_RELATION_TYPES,
  BROADCAST_STATES,
  BROADCAST_TYPES,
  DATA_STATUSES,
  EPISODE_PUBLICATION_STATUSES,
  EPISODE_TYPES,
  RESOURCE_CATEGORIES,
  SEASON_QUARTERS,
  SEASON_TYPES,
  WEEKDAY_VALUES,
} from "@menghuan/domain";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const animeMediaTypeEnum = pgEnum("anime_media_type", ANIME_MEDIA_TYPES);
export const animeReleaseStatusEnum = pgEnum("anime_release_status", ANIME_RELEASE_STATUSES);
export const dataStatusEnum = pgEnum("data_status", DATA_STATUSES);
export const seasonQuarterEnum = pgEnum("season_quarter", SEASON_QUARTERS);
export const seasonTypeEnum = pgEnum("season_type", SEASON_TYPES);
export const animeSeasonRelationTypeEnum = pgEnum(
  "anime_season_relation_type",
  ANIME_SEASON_RELATION_TYPES,
);
export const broadcastTypeEnum = pgEnum("broadcast_type", BROADCAST_TYPES);
export const broadcastStateEnum = pgEnum("broadcast_state", BROADCAST_STATES);
export const weekdayEnum = pgEnum("weekday", WEEKDAY_VALUES);
export const episodeTypeEnum = pgEnum("episode_type", EPISODE_TYPES);
export const episodePublicationStatusEnum = pgEnum(
  "episode_publication_status",
  EPISODE_PUBLICATION_STATUSES,
);
export const resourceCategoryEnum = pgEnum("resource_category", RESOURCE_CATEGORIES);

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "string" }).notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull();

export const anime = pgTable(
  "anime",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    aliases: text("aliases").array().notNull(),
    synopsis: text("synopsis").notNull(),
    mediaType: animeMediaTypeEnum("media_type").notNull(),
    releaseStatus: animeReleaseStatusEnum("release_status").notNull(),
    tags: text("tags").array().notNull(),
    dataStatus: dataStatusEnum("data_status").notNull(),
    isMock: boolean("is_mock").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("anime_slug_unique").on(table.slug),
    index("anime_created_at_idx").on(table.createdAt, table.id),
    check("anime_title_not_blank", sql`length(trim(${table.title})) > 0`),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: text("id").primaryKey(),
    year: integer("year").notNull(),
    quarter: seasonQuarterEnum("quarter").notNull(),
    label: text("label").notNull(),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    referenceTimezone: text("reference_timezone"),
    seasonType: seasonTypeEnum("season_type").notNull(),
    dataStatus: dataStatusEnum("data_status").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("seasons_year_quarter_type_unique").on(table.year, table.quarter, table.seasonType),
    check("seasons_year_range", sql`${table.year} between 1900 and 2200`),
    check(
      "seasons_date_order",
      sql`${table.startDate} is null or ${table.endDate} is null or ${table.startDate} <= ${table.endDate}`,
    ),
  ],
);

export const animeSeasons = pgTable(
  "anime_seasons",
  {
    animeId: text("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "restrict" }),
    relationType: animeSeasonRelationTypeEnum("relation_type").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.animeId, table.seasonId] }),
    index("anime_seasons_season_idx").on(table.seasonId),
  ],
);

export const broadcastInfo = pgTable(
  "broadcast_info",
  {
    id: text("id").primaryKey(),
    animeId: text("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    broadcastType: broadcastTypeEnum("broadcast_type").notNull(),
    sourceTimezone: text("source_timezone"),
    sourceOriginalDateText: text("source_original_date_text"),
    sourceOriginalTimeText: text("source_original_time_text"),
    originalExpression: text("original_expression").notNull(),
    normalizedStartAt: timestamp("normalized_start_at", {
      withTimezone: true,
      mode: "string",
    }),
    sourceWeekday: weekdayEnum("source_weekday"),
    availabilityState: broadcastStateEnum("availability_state").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    isTentative: boolean("is_tentative").notNull().default(false),
    note: text("note"),
    dataStatus: dataStatusEnum("data_status").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("broadcast_info_anime_idx").on(table.animeId),
    index("broadcast_info_start_idx").on(table.normalizedStartAt),
    check(
      "broadcast_info_tbd_time_null",
      sql`${table.availabilityState} <> 'tbd' or ${table.normalizedStartAt} is null`,
    ),
    check(
      "broadcast_info_normalized_requires_timezone",
      sql`${table.normalizedStartAt} is null or ${table.sourceTimezone} is not null`,
    ),
  ],
);

export const episodes = pgTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    animeId: text("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    episodeType: episodeTypeEnum("episode_type").notNull(),
    sortValue: integer("sort_value").notNull(),
    displayNumber: text("display_number").notNull(),
    title: text("title").notNull(),
    normalizedReleaseAt: timestamp("normalized_release_at", {
      withTimezone: true,
      mode: "string",
    }),
    publicationStatus: episodePublicationStatusEnum("publication_status").notNull(),
    isRecap: boolean("is_recap").notNull().default(false),
    isFinal: boolean("is_final").notNull().default(false),
    dataStatus: dataStatusEnum("data_status").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("episodes_anime_sort_unique").on(table.animeId, table.sortValue),
    index("episodes_anime_idx").on(table.animeId),
    check("episodes_sort_nonnegative", sql`${table.sortValue} >= 0`),
  ],
);

export const animeStaffCredits = pgTable(
  "anime_staff_credits",
  {
    id: text("id").primaryKey(),
    animeId: text("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    dataStatus: dataStatusEnum("data_status").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("anime_staff_credit_unique").on(table.animeId, table.role, table.name),
    index("anime_staff_credit_order_idx").on(table.animeId, table.sortOrder),
  ],
);

export const animeCastCredits = pgTable(
  "anime_cast_credits",
  {
    id: text("id").primaryKey(),
    animeId: text("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    characterName: text("character_name").notNull(),
    performerName: text("performer_name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    dataStatus: dataStatusEnum("data_status").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("anime_cast_credit_unique").on(
      table.animeId,
      table.characterName,
      table.performerName,
    ),
    index("anime_cast_credit_order_idx").on(table.animeId, table.sortOrder),
  ],
);

export const animeResourceCategories = pgTable(
  "anime_resource_categories",
  {
    animeId: text("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    category: resourceCategoryEnum("category").notNull(),
    sortOrder: integer("sort_order").notNull(),
    dataStatus: dataStatusEnum("data_status").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.animeId, table.category] }),
    index("anime_resource_category_order_idx").on(table.animeId, table.sortOrder),
  ],
);

export const stage3Schema = {
  anime,
  seasons,
  animeSeasons,
  broadcastInfo,
  episodes,
  animeStaffCredits,
  animeCastCredits,
  animeResourceCategories,
};
