import { z } from "zod";
import {
  animeMediaTypeSchema,
  animeReleaseStatusSchema,
  animeSeasonRelationTypeSchema,
  broadcastStateSchema,
  broadcastTypeSchema,
  dataStatusSchema,
  episodePublicationStatusSchema,
  episodeTypeSchema,
  resourceCategorySchema,
  seasonQuarterSchema,
  seasonTypeSchema,
  weekdaySchema,
} from "./enums.js";

export const domainIdSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "ID必须为稳定的小写短横线格式");

export const animeSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug必须为小写字母、数字和单个短横线组合");

const isoDateTimeSchema = z.iso.datetime();
const isoDateSchema = z.iso.date();

export const animeSchema = z.object({
  id: domainIdSchema,
  slug: animeSlugSchema,
  title: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().min(1).max(200)).max(20),
  synopsis: z.string().trim().min(1).max(4000),
  mediaType: animeMediaTypeSchema,
  releaseStatus: animeReleaseStatusSchema,
  tags: z.array(z.string().trim().min(1).max(50)).max(30),
  dataStatus: dataStatusSchema,
  isMock: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const seasonSchema = z.object({
  id: domainIdSchema,
  year: z.number().int().min(1900).max(2200),
  quarter: seasonQuarterSchema,
  label: z.string().trim().min(1).max(100),
  startDate: isoDateSchema.nullable(),
  endDate: isoDateSchema.nullable(),
  referenceTimezone: z.string().trim().min(1).max(100).nullable(),
  seasonType: seasonTypeSchema,
  dataStatus: dataStatusSchema,
});

export const animeSeasonSchema = z.object({
  animeId: domainIdSchema,
  seasonId: domainIdSchema,
  relationType: animeSeasonRelationTypeSchema,
  isPrimary: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export const broadcastInfoSchema = z
  .object({
    id: domainIdSchema,
    animeId: domainIdSchema,
    broadcastType: broadcastTypeSchema,
    sourceTimezone: z.string().trim().min(1).max(100).nullable(),
    sourceOriginalDateText: z.string().trim().min(1).max(200).nullable(),
    sourceOriginalTimeText: z.string().trim().min(1).max(200).nullable(),
    originalExpression: z.string().trim().min(1).max(500),
    normalizedStartAt: isoDateTimeSchema.nullable(),
    sourceWeekday: weekdaySchema.nullable(),
    availabilityState: broadcastStateSchema,
    isPrimary: z.boolean(),
    isTentative: z.boolean(),
    note: z.string().trim().min(1).max(1000).nullable(),
    dataStatus: dataStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .superRefine((value, context) => {
    if (value.availabilityState === "tbd" && value.normalizedStartAt !== null) {
      context.addIssue({
        code: "custom",
        path: ["normalizedStartAt"],
        message: "时间待定记录不得包含规范化时间",
      });
    }
    if (value.normalizedStartAt !== null && value.sourceTimezone === null) {
      context.addIssue({
        code: "custom",
        path: ["sourceTimezone"],
        message: "已规范化的来源时间必须保留明确来源时区",
      });
    }
  });

export const episodeSchema = z.object({
  id: domainIdSchema,
  animeId: domainIdSchema,
  episodeType: episodeTypeSchema,
  sortValue: z.number().int().min(0),
  displayNumber: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  normalizedReleaseAt: isoDateTimeSchema.nullable(),
  publicationStatus: episodePublicationStatusSchema,
  isRecap: z.boolean(),
  isFinal: z.boolean(),
  dataStatus: dataStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const staffCreditSchema = z.object({
  id: domainIdSchema,
  animeId: domainIdSchema,
  role: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0),
  dataStatus: dataStatusSchema,
  createdAt: isoDateTimeSchema,
});

export const castCreditSchema = z.object({
  id: domainIdSchema,
  animeId: domainIdSchema,
  characterName: z.string().trim().min(1).max(200),
  performerName: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0),
  dataStatus: dataStatusSchema,
  createdAt: isoDateTimeSchema,
});

export const animeResourceCategorySchema = z.object({
  animeId: domainIdSchema,
  category: resourceCategorySchema,
  dataStatus: dataStatusSchema,
  createdAt: isoDateTimeSchema,
});

export const animePageDataSchema = z.object({
  anime: animeSchema,
  season: seasonSchema.nullable(),
  animeSeason: animeSeasonSchema.nullable(),
  broadcast: broadcastInfoSchema.nullable(),
  episodes: z.array(episodeSchema),
  staffCredits: z.array(staffCreditSchema),
  castCredits: z.array(castCreditSchema),
  resourceCategories: z.array(resourceCategorySchema),
});

export const animePageDataArraySchema = z.array(animePageDataSchema);

export type Anime = z.infer<typeof animeSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type AnimeSeason = z.infer<typeof animeSeasonSchema>;
export type BroadcastInfo = z.infer<typeof broadcastInfoSchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type StaffCredit = z.infer<typeof staffCreditSchema>;
export type CastCredit = z.infer<typeof castCreditSchema>;
export type AnimeResourceCategory = z.infer<typeof animeResourceCategorySchema>;
export type AnimePageData = z.infer<typeof animePageDataSchema>;
