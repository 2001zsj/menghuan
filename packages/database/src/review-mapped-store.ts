import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import {
  adoptionDecisionSchema,
  mappingDecisionSchema,
  reviewObservationSchema,
  reviewWorkSchema,
  reviewValuesSchema,
  reviewFieldValues,
  REVIEW_TEST_SESSION,
  reviewUuidSchema,
  reviewReasonSchema,
  reviewDispositionSchema,
  type ReviewField,
  type ReviewValues,
  type ReviewObservation,
  type RealObservation,
  type ReviewWork,
  type RealWork,
} from "@menghuan/domain";
import type { Stage3Sql } from "./client.js";
import { reviewPage } from "./review-page.js";
import { assertLocalDatabase } from "./local-identity.js";

type Tx = TransactionSql;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const reviewDigest = (input: unknown) =>
  createHash("sha256").update(canonical(input)).digest("hex");
export class ReviewMappedStore {
  constructor(protected readonly sql: Stage3Sql) {}
  protected parseObservation(input: unknown): ReviewObservation | RealObservation {
    return reviewObservationSchema.parse(input);
  }
  protected parseWork(input: unknown): ReviewWork | RealWork {
    return reviewWorkSchema.parse(input);
  }
  protected async checkObservation(
    _tx: Tx,
    _o: ReviewObservation | RealObservation,
  ): Promise<void> {
    void _tx;
    void _o;
  }
  protected async checkWork(_tx: Tx, _w: ReviewWork | RealWork): Promise<void> {
    void _tx;
    void _w;
  }

  async startTestSession(id: string) {
    if (id !== REVIEW_TEST_SESSION)
      throw new Error(
        "Only the authored synthetic test session is executable; real import is disabled",
      );
    await assertLocalDatabase(this.sql, "synthetic-test");
    await this
      .sql`insert into stage5_review_sessions(id,purpose,enabled) values(${id},'synthetic-review-test',true) on conflict(id) do nothing`;
  }
  protected async session(tx: Tx, id: string, requireEnabled = true) {
    await assertLocalDatabase(tx, "synthetic-test");
    reviewUuidSchema.parse(id);
    const [row] =
      await tx`select purpose,enabled from stage5_review_sessions where id=${id} for update`;
    if (!row || row.purpose !== "synthetic-review-test" || id !== REVIEW_TEST_SESSION)
      throw new Error("Explicit synthetic test session required");
    if (requireEnabled && !row.enabled)
      throw new Error("Source disabled; no new import or adoption");
    return row;
  }
  async setEnabled(id: string, enabled: boolean) {
    if (typeof enabled !== "boolean") throw new Error("Boolean source switch required");
    await this.sql.begin(async (tx) => {
      await this.session(tx, id, false);
      await tx`update stage5_review_sessions set enabled=${enabled} where id=${id}`;
    });
  }
  async saveObservation(sessionId: string, input: unknown) {
    const o = this.parseObservation(input);
    if (o.sessionId !== sessionId) throw new Error("Observation belongs to another session");
    const digest = reviewDigest(o);
    return await this.sql.begin(async (tx) => {
      await this.session(tx, sessionId);
      await this.checkObservation(tx, o);
      const [old] =
        await tx`select version,digest from stage5_review_observations where id=${o.observationId} for update`;
      if (old?.digest === digest) return "duplicate";
      if (old && o.version !== old.version + 1)
        throw new Error("Candidate version stale; reload observation");
      if (!old && o.version !== 1) throw new Error("New observation version must be 1");
      await tx`insert into stage5_review_observations(id,session_id,version,digest,payload)
        values(${o.observationId},${sessionId},${o.version},${digest},${JSON.stringify(o)}::jsonb)
        on conflict(id) do update set version=excluded.version,digest=excluded.digest,payload=excluded.payload`;
      await tx`insert into stage5_review_observation_history(observation_id,version,digest,payload) values(${o.observationId},${o.version},${digest},${JSON.stringify(o)}::jsonb)`;
      return "saved";
    });
  }
  async createTestWork(input: unknown) {
    const w = this.parseWork(input);
    await this.sql.begin(async (tx) => {
      await this.session(tx, w.sessionId);
      await this.checkWork(tx, w);
      const [old] =
        await tx`select slug,base_values,session_id from stage5_review_works where id=${w.id}`;
      if (old) {
        if (
          old.slug !== w.slug ||
          old.session_id !== w.sessionId ||
          canonical(old.base_values) !== canonical(w.values)
        )
          throw new Error("Existing work differs; never overwrite");
        return;
      }
      await tx`insert into stage5_review_works(id,slug,session_id,base_values,current_values) values(${w.id},${w.slug},${w.sessionId},${JSON.stringify(w.values)}::jsonb,${JSON.stringify(w.values)}::jsonb)`;
    });
  }
  async listObservations(sessionId: string) {
    await this.sql.begin((tx) => this.session(tx, sessionId, false));
    const rows = await this
      .sql`select payload,digest,version from stage5_review_observations where session_id=${sessionId} order by id`;
    return rows.map((r) => ({
      observation: this.parseObservation(r.payload),
      digest: String(r.digest),
      version: Number(r.version),
    }));
  }
  async listWorks(sessionId: string) {
    await this.sql.begin((tx) => this.session(tx, sessionId, false));
    const rows = await this
      .sql`select id,slug,version,current_values,owners from stage5_review_works where session_id=${sessionId} order by id`;
    return rows.map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      version: Number(r.version),
      values: reviewValuesSchema.parse(r.current_values),
      owners: r.owners as Record<string, string>,
    }));
  }
  async history(sessionId: string) {
    await this.sql.begin((tx) => this.session(tx, sessionId, false));
    return {
      mappings: await this
        .sql`select m.* from stage5_review_mappings m join stage5_review_observations o on o.id=m.observation_id where o.session_id=${sessionId} order by m.created_at,m.id`,
      adoptions: await this
        .sql`select a.* from stage5_review_adoptions a join stage5_review_mappings m on m.id=a.mapping_id join stage5_review_observations o on o.id=m.observation_id where o.session_id=${sessionId} order by a.created_at,a.id`,
      dispositions: await this
        .sql`select d.* from stage5_review_dispositions d join stage5_review_observations o on o.id=d.observation_id where o.session_id=${sessionId} order by d.sequence`,
    };
  }
  private async reviewed(
    tx: Tx,
    observationId: string,
    workId: string,
    sessionId: string,
    version: number,
    digest: string,
    entityVersion: number,
  ) {
    const [o] =
      await tx`select payload,version,digest,session_id from stage5_review_observations where id=${observationId} for update`;
    const [w] = await tx`select * from stage5_review_works where id=${workId} for update`;
    if (!o || o.session_id !== sessionId || o.version !== version || o.digest !== digest)
      throw new Error("Candidate changed or missing; reload candidate version and digest");
    const [disposition] =
      await tx`select status from stage5_review_dispositions where observation_id=${observationId} order by sequence desc limit 1`;
    if (disposition?.status === "rejected")
      throw new Error(
        "Observation rejected; record a new pending review before mapping or adoption",
      );
    if (!w || w.session_id !== sessionId || w.version !== entityVersion)
      throw new Error("Internal entity changed or missing; reload entity version");
    return { o: this.parseObservation(o.payload), w };
  }
  async map(input: unknown) {
    const d = mappingDecisionSchema.parse(input);
    return await this.sql.begin(async (tx) => {
      await this.session(tx, d.sessionId);
      const [old] = await tx`select request from stage5_review_mappings where id=${d.decisionId}`;
      if (old) {
        if (canonical(old.request) !== canonical(d))
          throw new Error("Decision ID reused with different content");
        return "duplicate";
      }
      await this.reviewed(
        tx,
        d.observationId,
        d.internalAnimeId,
        d.sessionId,
        d.expectedCandidateVersion,
        d.expectedDigest,
        d.expectedEntityVersion,
      );
      const [active] =
        await tx`select id,request from stage5_review_mappings where observation_id=${d.observationId} and status='approved'`;
      if (active)
        throw new Error("Observation already mapped; withdraw old decision before correction");
      if (d.supersedes) {
        const [previous] =
          await tx`select status,request from stage5_review_mappings where id=${d.supersedes}`;
        if (
          !previous ||
          previous.status !== "revoked" ||
          previous.request.projectMappingKey !== d.projectMappingKey
        )
          throw new Error("Superseded mapping must be revoked and share the project anchor");
      }
      await tx`insert into stage5_review_mappings(id,observation_id,work_id,request,status) values(${d.decisionId},${d.observationId},${d.internalAnimeId},${JSON.stringify(d)}::jsonb,'approved')`;
      return "mapped";
    });
  }
  async dispose(
    sessionId: string,
    observationId: string,
    status: "pending" | "rejected",
    reason: string,
  ) {
    reviewUuidSchema.parse(observationId);
    reviewDispositionSchema.parse(status);
    reviewReasonSchema.parse(reason);
    await this.sql.begin(async (tx) => {
      await this.session(tx, sessionId, false);
      const [o] =
        await tx`select id from stage5_review_observations where id=${observationId} and session_id=${sessionId}`;
      if (!o) throw new Error("Observation missing");
      await tx`insert into stage5_review_dispositions(observation_id,status,reason) values(${observationId},${status},${reason})`;
    });
  }
  async adopt(input: unknown) {
    const d = adoptionDecisionSchema.parse(input);
    return await this.sql.begin(async (tx) => {
      await this.session(tx, d.sessionId);
      const [old] = await tx`select request from stage5_review_adoptions where id=${d.adoptionId}`;
      if (old) {
        if (canonical(old.request) !== canonical(d))
          throw new Error("Adoption ID reused with different content");
        return "duplicate";
      }
      const [m] =
        await tx`select * from stage5_review_mappings where id=${d.mappingId} and status='approved'`;
      if (!m) throw new Error("Approved mapping missing");
      if (
        m.request.expectedCandidateVersion !== d.expectedCandidateVersion ||
        m.request.expectedDigest !== d.expectedDigest
      )
        throw new Error(
          "Mapping reviewed a different candidate; create an explicit revision decision",
        );
      const { o, w } = await this.reviewed(
        tx,
        m.observation_id,
        m.work_id,
        d.sessionId,
        d.expectedCandidateVersion,
        d.expectedDigest,
        d.expectedEntityVersion,
      );
      const values = reviewFieldValues(o.fields);
      const current = reviewValuesSchema.parse(w.current_values);
      const conflicts = d.fields.filter(
        (f) => canonical(current[f]) !== canonical(values[f]) && !isUnknown(f, current[f]),
      );
      const status = conflicts.length && !d.resolvesConflicts ? "conflict" : "approved";
      await tx`insert into stage5_review_adoptions(id,mapping_id,request,status,conflicts) values(${d.adoptionId},${d.mappingId},${JSON.stringify(d)}::jsonb,${status},${JSON.stringify(conflicts)}::jsonb)`;
      if (status === "conflict") return "conflict";
      const owners = { ...w.owners };
      const next = { ...current };
      for (const field of d.fields) {
        const value = values[field];
        Object.assign(next, { [field]: value });
        owners[field] = d.adoptionId;
        const provenance = {
          ...o.provenance.find((p) => p.field === field),
          dataNature: o.dataNature,
          observationId: o.observationId,
          candidateVersion: o.version,
          sourcePageUrl: o.sourcePageUrl,
          observedAt: o.observedAt,
          parserVersion: o.parserVersion,
          adoptedValue: values[field],
          evidence: m.request.evidence,
          reason: d.reason,
        };
        await tx`insert into stage5_review_contributions(adoption_id,work_id,field,value,provenance) values(${d.adoptionId},${w.id},${field},${JSON.stringify(value)}::jsonb,${JSON.stringify(provenance)}::jsonb)`;
      }
      reviewValuesSchema.parse(next);
      await tx`update stage5_review_works set current_values=${JSON.stringify(next)}::jsonb,owners=${JSON.stringify(owners)}::jsonb,version=version+1 where id=${w.id}`;
      return "adopted";
    });
  }
  private async revokeAdoption(tx: Tx, id: string, reason: string) {
    const [a] =
      await tx`select a.*,m.work_id from stage5_review_adoptions a join stage5_review_mappings m on m.id=a.mapping_id where a.id=${id}`;
    if (!a || a.status === "revoked") return;
    await tx`update stage5_review_adoptions set status='revoked',revoked_reason=${reason} where id=${id}`;
    const [w] = await tx`select * from stage5_review_works where id=${a.work_id} for update`;
    if (!w) throw new Error("Mapped work missing");
    const current = reviewValuesSchema.parse(w.current_values);
    const base = reviewValuesSchema.parse(w.base_values);
    const owners = { ...w.owners };
    let changed = false;
    for (const field of a.request.fields as ReviewField[]) {
      if (owners[field] !== id) continue;
      const [next] =
        await tx`select c.value,c.adoption_id from stage5_review_contributions c join stage5_review_adoptions a on a.id=c.adoption_id where c.work_id=${w.id} and c.field=${field} and a.status='approved' order by c.sequence desc limit 1`;
      Object.assign(current, { [field]: next ? next.value : base[field] });
      if (next) owners[field] = next.adoption_id;
      else delete owners[field];
      changed = true;
    }
    if (changed)
      await tx`update stage5_review_works set current_values=${JSON.stringify(current)}::jsonb,owners=${JSON.stringify(owners)}::jsonb,version=version+1 where id=${w.id}`;
  }
  async withdraw(sessionId: string, mappingId: string, reason: string) {
    reviewUuidSchema.parse(mappingId);
    reviewReasonSchema.parse(reason);
    await this.sql.begin(async (tx) => {
      await this.session(tx, sessionId, false);
      const [m] =
        await tx`select m.* from stage5_review_mappings m join stage5_review_observations o on o.id=m.observation_id where m.id=${mappingId} and o.session_id=${sessionId}`;
      if (!m) throw new Error("Mapping missing");
      const adoptions =
        await tx`select id from stage5_review_adoptions where mapping_id=${mappingId} and status<>'revoked' order by created_at desc`;
      for (const a of adoptions) await this.revokeAdoption(tx, a.id, reason);
      await tx`update stage5_review_mappings set status='revoked',revoked_reason=${reason} where id=${mappingId}`;
    });
  }
  async adoptedPages() {
    const rows = await this
      .sql`select w.*,s.enabled from stage5_review_works w join stage5_review_sessions s on s.id=w.session_id where w.owners<>'{}'::jsonb order by w.id`;
    return rows.map((w) =>
      reviewPage({
        id: w.id,
        slug: w.slug,
        values: reviewValuesSchema.parse(w.current_values),
        enabled: w.enabled,
        adoptedFields: Object.keys(w.owners) as ReviewField[],
      }),
    );
  }
}
function isUnknown(field: ReviewField, value: ReviewValues[ReviewField]): boolean {
  if (value === null || value === "unknown") return true;
  if (field === "date") return (value as ReviewValues["date"]).raw === null;
  if (field === "time") return (value as ReviewValues["time"]).raw === null;
  return false;
}
