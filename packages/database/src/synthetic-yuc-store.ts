import {
  animePageDataSchema,
  syntheticCandidateSchema,
  type AnimePageData,
} from "@menghuan/domain";
import type { Stage3Sql } from "./client.js";

/** Only explicit local demo operations; no network, scheduling or public promotion. */
export class SyntheticYucStore {
  constructor(private readonly sql: Stage3Sql) {}

  async setEnabled(enabled: boolean): Promise<void> {
    if (typeof enabled !== "boolean") throw new RangeError("Invalid source switch");
    await this
      .sql`update stage5_yuc_source set enabled=${enabled} where source_key='synthetic-yuc'`;
  }

  async isEnabled(): Promise<boolean> {
    const [row] = await this.sql<
      { enabled: boolean }[]
    >`select enabled from stage5_yuc_source where source_key='synthetic-yuc'`;
    return row?.enabled ?? false;
  }

  async importCandidates(inputs: readonly unknown[]): Promise<number> {
    const records = inputs.map((input) => syntheticCandidateSchema.parse(input));
    return await this.sql.begin(async (tx) => {
      const [source] =
        await tx`select enabled from stage5_yuc_source where source_key='synthetic-yuc' for update`;
      if (!source?.enabled) throw new Error("Synthetic source disabled");
      let count = 0;
      for (const record of records) {
        const inserted = await tx`insert into stage5_yuc_candidates(record_id,entity_key,payload)
          values (${record.record.sourceRecordId},${record.record.stableKey},${JSON.stringify(record)}::jsonb)
          on conflict (record_id) do nothing returning record_id`;
        count += inserted.length;
      }
      return count;
    });
  }

  async listCandidates() {
    const rows = await this.sql`select payload from stage5_yuc_candidates order by record_id`;
    return rows.map((row) => syntheticCandidateSchema.parse(row.payload));
  }

  async adopt(
    id: string,
    input: unknown,
    reason: string,
    expectedActiveId: string | null = null,
  ): Promise<"adopted" | "duplicate" | "conflict"> {
    const page = animePageDataSchema.parse(input);
    const sourceMetadata = page.syntheticSource;
    if (
      !sourceMetadata ||
      !page.anime.isMock ||
      !page.anime.id.startsWith("synthetic-") ||
      !page.anime.slug.startsWith("synthetic-") ||
      reason.trim().length < 5 ||
      reason.length > 500
    )
      throw new Error("Explicit synthetic mapping required");
    return await this.sql.begin(async (tx) => {
      const [source] =
        await tx`select enabled from stage5_yuc_source where source_key='synthetic-yuc' for update`;
      if (!source?.enabled) throw new Error("Synthetic source disabled");
      const [candidate] =
        await tx`select entity_key,payload from stage5_yuc_candidates where record_id=${id} for update`;
      if (!candidate) throw new Error("Candidate missing");
      const record = syntheticCandidateSchema.parse(candidate.payload).record;
      if (
        sourceMetadata.entityId !== record.sourceEntityId ||
        page.anime.title !== record.fields.title
      )
        throw new Error("Mapping identity mismatch");
      if ((page.broadcast?.sourceOriginalTimeText ?? null) !== record.fields.broadcast.rawTimeText)
        throw new Error("Mapped raw time disagrees with candidate");
      if (
        (page.broadcast?.sourceTimezone ?? null) !== record.fields.broadcast.rawTimezoneText ||
        Boolean(page.broadcast?.isTentative) !==
          (record.fields.broadcast.timeStatus === "tentative")
      )
        throw new Error("Mapped time status disagrees with candidate");
      if (
        record.fields.broadcast.timeStatus === "unknown" &&
        page.broadcast?.normalizedStartAt != null
      )
        throw new Error("Unknown time cannot be normalized by mapping");
      const [current] =
        await tx`select record_id from stage5_yuc_candidates where entity_key=${candidate.entity_key} and active`;
      if (current?.record_id === id) return "duplicate";
      if ((current?.record_id ?? null) !== expectedActiveId) return "conflict";
      await tx`update stage5_yuc_candidates set active=false where entity_key=${candidate.entity_key}`;
      const adopted = {
        ...page,
        syntheticSource: {
          ...sourceMetadata,
          originalExpression: record.fields.broadcast.originalExpression,
          mappingReason: reason,
        },
      };
      await tx`update stage5_yuc_candidates set active=true,adopted_page=${JSON.stringify(adopted)}::jsonb,mapping_reason=${reason} where record_id=${id}`;
      return "adopted";
    });
  }

  async withdraw(id: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`select source_key from stage5_yuc_source where source_key='synthetic-yuc' for update`;
      await tx`update stage5_yuc_candidates set active=false where record_id=${id}`;
    });
  }

  async adoptedPages(): Promise<AnimePageData[]> {
    const rows = await this
      .sql`select adopted_page from stage5_yuc_candidates where active order by record_id`;
    return rows.map((row) => animePageDataSchema.parse(row.adopted_page));
  }

  async mappingSnapshots() {
    const rows = await this
      .sql`select record_id,adopted_page,mapping_reason,active from stage5_yuc_candidates where adopted_page is not null order by record_id`;
    return rows.map((row) => ({
      recordId: String(row.record_id),
      page: animePageDataSchema.parse(row.adopted_page),
      reason: String(row.mapping_reason),
      active: Boolean(row.active),
    }));
  }
}
