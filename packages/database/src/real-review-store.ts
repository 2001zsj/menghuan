import type { TransactionSql } from "postgres";
import {
  realObservationSchema,
  realSessionSchema,
  realWorkSchema,
  reviewUuidSchema,
  type RealObservation,
  type RealWork,
  type ReviewObservation,
  type ReviewWork,
  reviewValuesSchema,
  type ReviewField,
} from "@menghuan/domain";
import { createDatabaseClient, type Stage3Sql } from "./client.js";
import { ReviewMappedStore, reviewDigest } from "./review-mapped-store.js";
import { assertLocalDatabase } from "./local-identity.js";
import { reviewPage } from "./review-page.js";
export function createRealReviewClient(url: string) {
  const u = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    !["127.0.0.1", "[::1]"].includes(u.hostname) ||
    !/^\/menghuan_stage5_test_real_[a-z0-9_]+$/.test(u.pathname) ||
    u.search ||
    u.hash
  )
    throw new Error("Explicit loopback real-evaluation database required");
  return createDatabaseClient(url, {
    localReviewNamespace: "stage5_real",
    applicationName: "menghuan-stage5-real-local",
  });
}
export class RealReviewStore extends ReviewMappedStore {
  constructor(
    sql: Stage3Sql,
    private readonly expectedDatabase: string,
    private readonly sessionId: string,
  ) {
    super(sql);
    reviewUuidSchema.parse(sessionId);
  }
  override async startTestSession(): Promise<never> {
    throw new Error("Synthetic initialization is not a real-local entry");
  }
  protected override parseObservation(input: unknown) {
    return realObservationSchema.parse(input);
  }
  protected override parseWork(input: unknown) {
    return realWorkSchema.parse(input);
  }
  async startLocalSession(input: unknown) {
    const scope = realSessionSchema.parse(input);
    if (
      scope.id !== this.sessionId ||
      Date.parse(scope.createdAt) > Date.now() + 1000 ||
      Date.parse(scope.expiresAt) <= Date.now()
    )
      throw new Error("Explicit current local scope required");
    await assertLocalDatabase(this.sql, "real-local", this.expectedDatabase);
    const [namespace] = await this.sql`select current_schema() as name`;
    if (namespace?.name !== "stage5_real") throw new Error("Real review storage namespace missing");
    await this.sql.begin(async (tx) => {
      const [old] =
        await tx`select scope from stage5_review_sessions where id=${scope.id} for update`;
      if (old) {
        if (reviewDigest(old.scope) !== reviewDigest(scope))
          throw new Error("Session scope already fixed");
        return;
      }
      await tx`insert into stage5_review_sessions(id,purpose,enabled,scope) values(${scope.id},${scope.purpose},false,${JSON.stringify(scope)}::jsonb)`;
    });
  }
  protected override async session(tx: TransactionSql, id: string, requireEnabled = true) {
    if (id !== this.sessionId) throw new Error("Wrong local session");
    await assertLocalDatabase(tx, "real-local", this.expectedDatabase);
    const [namespace] = await tx`select current_schema() as name`;
    if (namespace?.name !== "stage5_real") throw new Error("Real review storage namespace missing");
    const [r] =
      await tx`select purpose,enabled,scope,snapshot_id from stage5_review_sessions where id=${id} for update`;
    if (!r || r.purpose !== "local-noncommercial-evaluation")
      throw new Error("Explicit local scope missing");
    const scope = realSessionSchema.parse(r.scope);
    if (requireEnabled && (Date.parse(scope.expiresAt) <= Date.now() || !r.enabled))
      throw new Error("Source disabled or session expired");
    return r;
  }
  protected override async checkObservation(
    tx: TransactionSql,
    input: ReviewObservation | RealObservation,
  ) {
    const o = realObservationSchema.parse(input),
      s = await this.session(tx, o.sessionId);
    if (
      o.dataNature !== s.scope.dataNature ||
      Date.parse(o.observedAt) < Date.parse(s.scope.createdAt) ||
      Date.parse(o.observedAt) > Date.parse(s.scope.expiresAt) ||
      Date.parse(o.observedAt) > Date.now() + 1000
    )
      throw new Error("Observation outside approved scope");
    if (s.snapshot_id && s.snapshot_id !== o.snapshotId)
      throw new Error("Only one approved snapshot");
    const [count] =
      await tx`select count(*)::int as n from stage5_review_observations where session_id=${o.sessionId} and id<>${o.observationId}`;
    if (count!.n >= 3) throw new Error("At most three candidates");
    await tx`update stage5_review_sessions set snapshot_id=${o.snapshotId} where id=${o.sessionId}`;
  }
  protected override async checkWork(tx: TransactionSql, input: ReviewWork | RealWork) {
    const w = realWorkSchema.parse(input),
      s = await this.session(tx, w.sessionId);
    const [row] =
      await tx`select payload from stage5_review_observations where id=${w.originObservationId} and session_id=${w.sessionId}`;
    if (!row || w.dataNature !== s.scope.dataNature)
      throw new Error("Temporary entity must identify its approved observation");
    const o = realObservationSchema.parse(row.payload);
    const base = reviewValuesSchema.parse({
      title: o.fields.title,
      date: { raw: null, normalized: null },
      time: { raw: null, parsed: null },
      timezone: null,
      year: null,
      quarter: null,
      status: "unknown",
    });
    if (reviewDigest(w.values) !== reviewDigest(base))
      throw new Error(
        "New entity only has its explicitly reviewed title; fields require separate adoption",
      );
    const duplicate =
      await tx`select id from stage5_review_observations where session_id=${w.sessionId} and payload->'fields'->>'title'=${o.fields.title}`;
    if (duplicate.length !== 1) throw new Error("Same title ambiguous; keep pending");
  }
  async createLocalWork(input: unknown) {
    const w = realWorkSchema.parse(input);
    await this.sql.begin(async (tx) => {
      await this.session(tx, w.sessionId);
      await this.checkWork(tx, w);
      const [old] = await tx`select identity_evidence from stage5_review_works where id=${w.id}`;
      if (old) {
        if (reviewDigest(old.identity_evidence) !== reviewDigest(w))
          throw new Error("Existing local identity differs");
        return;
      }
      await tx`insert into stage5_review_works(id,slug,session_id,base_values,current_values,identity_evidence) values(${w.id},${w.slug},${w.sessionId},${JSON.stringify(w.values)}::jsonb,${JSON.stringify(w.values)}::jsonb,${JSON.stringify(w)}::jsonb)`;
    });
  }
  override async createTestWork(): Promise<never> {
    throw new Error("Use explicit temporary local identity worksheet");
  }
  async reserveGet() {
    await this.sql.begin(async (tx) => {
      const s = await this.session(tx, this.sessionId);
      if (s.scope.dataNature !== "real")
        throw new Error("Synthetic test session cannot request YUC");
      const [r] =
        await tx`update stage5_review_sessions set request_spent=true where id=${this.sessionId} and request_spent=false returning id`;
      if (!r) throw new Error("One-shot budget already spent; no retry");
    });
  }
  override async adoptedPages() {
    const state = await this.scopeState();
    if (state.expired) return [];
    await assertLocalDatabase(this.sql, "real-local", this.expectedDatabase);
    const rows = await this
      .sql`select w.*,s.enabled,s.scope from stage5_review_works w join stage5_review_sessions s on s.id=w.session_id where w.session_id=${this.sessionId} and w.owners<>'{}'::jsonb order by w.id`;
    return rows
      .filter((w) => Date.parse(realSessionSchema.parse(w.scope).expiresAt) > Date.now())
      .map((w) =>
        reviewPage({
          id: w.id,
          slug: w.slug,
          values: reviewValuesSchema.parse(w.current_values),
          enabled: w.enabled,
          adoptedFields: Object.keys(w.owners) as ReviewField[],
          realNature: realSessionSchema.parse(w.scope).dataNature,
          localCreatedAt: realSessionSchema.parse(w.scope).createdAt,
        }),
      );
  }
  async scopeState() {
    const r = await this.sql.begin((tx) => this.session(tx, this.sessionId, false));
    const scope = realSessionSchema.parse(r.scope);
    return {
      dataNature: scope.dataNature,
      enabled: Boolean(r.enabled),
      expiresAt: scope.expiresAt,
      expired: Date.parse(scope.expiresAt) <= Date.now(),
    };
  }
  override async setEnabled(id: string, enabled: boolean) {
    if (typeof enabled !== "boolean") throw new Error("Boolean source switch required");
    await this.sql.begin(async (tx) => {
      const r = await this.session(tx, id, false);
      if (enabled && Date.parse(realSessionSchema.parse(r.scope).expiresAt) <= Date.now())
        throw new Error("Session expired; cannot re-enable");
      await tx`update stage5_review_sessions set enabled=${enabled} where id=${id}`;
    });
  }
  async contributionEvidence() {
    await this.sql.begin((tx) => this.session(tx, this.sessionId, false));
    return await this
      .sql`select c.field,c.value,c.provenance from stage5_review_contributions c join stage5_review_works w on w.id=c.work_id where w.session_id=${this.sessionId} order by c.sequence`;
  }
  async purgeSession() {
    const mappings = (await this.history(this.sessionId)).mappings;
    for (const m of mappings)
      await this.withdraw(this.sessionId, m.id, "Codex engineering review: end local evaluation");
    await this.sql.begin(async (tx) => {
      await this.session(tx, this.sessionId, false);
      await tx`delete from stage5_review_contributions where work_id in (select id from stage5_review_works where session_id=${this.sessionId})`;
      await tx`delete from stage5_review_adoptions where mapping_id in (select m.id from stage5_review_mappings m join stage5_review_observations o on o.id=m.observation_id where o.session_id=${this.sessionId})`;
      await tx`delete from stage5_review_mappings where observation_id in (select id from stage5_review_observations where session_id=${this.sessionId})`;
      await tx`delete from stage5_review_dispositions where observation_id in (select id from stage5_review_observations where session_id=${this.sessionId})`;
      await tx`delete from stage5_review_observation_history where observation_id in (select id from stage5_review_observations where session_id=${this.sessionId})`;
      await tx`delete from stage5_review_works where session_id=${this.sessionId}`;
      await tx`delete from stage5_review_observations where session_id=${this.sessionId}`;
      await tx`delete from stage5_review_sessions where id=${this.sessionId}`;
    });
    return {
      withdrawn: mappings.filter((m) => m.status === "approved").length,
      sessionDeleted: true,
    };
  }
}
