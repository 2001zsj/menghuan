import { stage3AnimeFixture, type AnimePageData } from "@menghuan/domain";
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

export async function seedStage3Fixture(
  db: Stage3Database,
  fixture: readonly AnimePageData[] = stage3AnimeFixture,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const record of fixture) {
      const animeValue = record.anime;
      await tx
        .insert(anime)
        .values(animeValue)
        .onConflictDoUpdate({
          target: anime.id,
          set: {
            slug: animeValue.slug,
            title: animeValue.title,
            aliases: animeValue.aliases,
            synopsis: animeValue.synopsis,
            mediaType: animeValue.mediaType,
            releaseStatus: animeValue.releaseStatus,
            tags: animeValue.tags,
            dataStatus: animeValue.dataStatus,
            isMock: animeValue.isMock,
            updatedAt: animeValue.updatedAt,
          },
        });

      if (record.season && record.animeSeason) {
        const seasonValue = {
          ...record.season,
          createdAt: animeValue.createdAt,
          updatedAt: animeValue.updatedAt,
        };
        await tx
          .insert(seasons)
          .values(seasonValue)
          .onConflictDoUpdate({
            target: seasons.id,
            set: {
              year: seasonValue.year,
              quarter: seasonValue.quarter,
              label: seasonValue.label,
              startDate: seasonValue.startDate,
              endDate: seasonValue.endDate,
              referenceTimezone: seasonValue.referenceTimezone,
              seasonType: seasonValue.seasonType,
              dataStatus: seasonValue.dataStatus,
              updatedAt: seasonValue.updatedAt,
            },
          });
        await tx
          .insert(animeSeasons)
          .values(record.animeSeason)
          .onConflictDoUpdate({
            target: [animeSeasons.animeId, animeSeasons.seasonId],
            set: {
              relationType: record.animeSeason.relationType,
              isPrimary: record.animeSeason.isPrimary,
            },
          });
      }

      if (record.broadcast) {
        await tx
          .insert(broadcastInfo)
          .values(record.broadcast)
          .onConflictDoUpdate({
            target: broadcastInfo.id,
            set: {
              broadcastType: record.broadcast.broadcastType,
              sourceTimezone: record.broadcast.sourceTimezone,
              sourceOriginalDateText: record.broadcast.sourceOriginalDateText,
              sourceOriginalTimeText: record.broadcast.sourceOriginalTimeText,
              originalExpression: record.broadcast.originalExpression,
              normalizedStartAt: record.broadcast.normalizedStartAt,
              sourceWeekday: record.broadcast.sourceWeekday,
              availabilityState: record.broadcast.availabilityState,
              isPrimary: record.broadcast.isPrimary,
              isTentative: record.broadcast.isTentative,
              note: record.broadcast.note,
              dataStatus: record.broadcast.dataStatus,
              updatedAt: record.broadcast.updatedAt,
            },
          });
      }

      for (const episode of record.episodes) {
        await tx
          .insert(episodes)
          .values(episode)
          .onConflictDoUpdate({
            target: episodes.id,
            set: {
              episodeType: episode.episodeType,
              sortValue: episode.sortValue,
              displayNumber: episode.displayNumber,
              title: episode.title,
              normalizedReleaseAt: episode.normalizedReleaseAt,
              publicationStatus: episode.publicationStatus,
              isRecap: episode.isRecap,
              isFinal: episode.isFinal,
              dataStatus: episode.dataStatus,
              updatedAt: episode.updatedAt,
            },
          });
      }

      for (const credit of record.staffCredits) {
        await tx
          .insert(animeStaffCredits)
          .values(credit)
          .onConflictDoUpdate({
            target: animeStaffCredits.id,
            set: {
              role: credit.role,
              name: credit.name,
              sortOrder: credit.sortOrder,
              dataStatus: credit.dataStatus,
            },
          });
      }

      for (const credit of record.castCredits) {
        await tx
          .insert(animeCastCredits)
          .values(credit)
          .onConflictDoUpdate({
            target: animeCastCredits.id,
            set: {
              characterName: credit.characterName,
              performerName: credit.performerName,
              sortOrder: credit.sortOrder,
              dataStatus: credit.dataStatus,
            },
          });
      }

      for (const [sortOrder, category] of record.resourceCategories.entries()) {
        await tx
          .insert(animeResourceCategories)
          .values({
            animeId: animeValue.id,
            category,
            sortOrder,
            dataStatus: animeValue.dataStatus,
            createdAt: animeValue.createdAt,
          })
          .onConflictDoUpdate({
            target: [animeResourceCategories.animeId, animeResourceCategories.category],
            set: { sortOrder, dataStatus: animeValue.dataStatus },
          });
      }
    }
  });
}
