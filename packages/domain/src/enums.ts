import { z } from "zod";

export const ANIME_MEDIA_TYPES = ["tv", "short", "movie"] as const;
export const ANIME_RELEASE_STATUSES = ["airing", "finished", "upcoming"] as const;
export const DATA_STATUSES = ["mock", "draft", "verified", "archived"] as const;
export const SEASON_QUARTERS = ["winter", "spring", "summer", "autumn", "other"] as const;
export const SEASON_TYPES = ["broadcast", "release", "other"] as const;
export const ANIME_SEASON_RELATION_TYPES = ["primary", "continuation", "other"] as const;
export const BROADCAST_TYPES = ["broadcast", "streaming"] as const;
export const BROADCAST_STATES = ["updated", "upcoming", "tbd"] as const;
export const WEEKDAY_VALUES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const EPISODE_TYPES = ["regular", "special", "recap", "movie"] as const;
export const EPISODE_PUBLICATION_STATUSES = ["published", "upcoming", "tbd"] as const;
export const RESOURCE_CATEGORIES = [
  "official_site",
  "official_social",
  "official_video_channel",
  "broadcaster",
  "verified_licensed_streaming",
  "distributor",
  "encyclopedia",
  "rating_site",
  "database",
  "news",
  "search",
  "approved_other",
] as const;

export const animeMediaTypeSchema = z.enum(ANIME_MEDIA_TYPES);
export const animeReleaseStatusSchema = z.enum(ANIME_RELEASE_STATUSES);
export const dataStatusSchema = z.enum(DATA_STATUSES);
export const seasonQuarterSchema = z.enum(SEASON_QUARTERS);
export const seasonTypeSchema = z.enum(SEASON_TYPES);
export const animeSeasonRelationTypeSchema = z.enum(ANIME_SEASON_RELATION_TYPES);
export const broadcastTypeSchema = z.enum(BROADCAST_TYPES);
export const broadcastStateSchema = z.enum(BROADCAST_STATES);
export const weekdaySchema = z.enum(WEEKDAY_VALUES);
export const episodeTypeSchema = z.enum(EPISODE_TYPES);
export const episodePublicationStatusSchema = z.enum(EPISODE_PUBLICATION_STATUSES);
export const resourceCategorySchema = z.enum(RESOURCE_CATEGORIES);

export type AnimeMediaType = z.infer<typeof animeMediaTypeSchema>;
export type AnimeReleaseStatus = z.infer<typeof animeReleaseStatusSchema>;
export type DataStatus = z.infer<typeof dataStatusSchema>;
export type SeasonQuarter = z.infer<typeof seasonQuarterSchema>;
export type SeasonType = z.infer<typeof seasonTypeSchema>;
export type AnimeSeasonRelationType = z.infer<typeof animeSeasonRelationTypeSchema>;
export type BroadcastType = z.infer<typeof broadcastTypeSchema>;
export type BroadcastState = z.infer<typeof broadcastStateSchema>;
export type Weekday = z.infer<typeof weekdaySchema>;
export type EpisodeType = z.infer<typeof episodeTypeSchema>;
export type EpisodePublicationStatus = z.infer<typeof episodePublicationStatusSchema>;
export type ResourceCategory = z.infer<typeof resourceCategorySchema>;
