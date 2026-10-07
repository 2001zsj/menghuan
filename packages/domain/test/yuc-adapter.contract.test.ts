import { describe, expect, it } from "vitest";
import {
  InMemoryYucCandidateStore,
  YucAdapter,
  parseYucHtml,
  type YucFetcher,
} from "../src/sources/yuc.js";

const sourcePageUrl = "https://yuc.wiki/new/";

const response = (status: number, body = "") => ({
  status,
  body,
  headers: {},
});

const fixture = `
<main>
  <article data-yuc-entry data-entity-id="synthetic-a" data-title="星光备忘录" data-date="2026-08-02" data-time="25:15" data-timezone="Asia/Tokyo" data-year="2026" data-quarter="summer">
    <p>这段简介不应进入候选字段。</p>
    <img src="https://third-party.example/poster.jpg" />
    <a href="https://third-party.example/player">播放</a>
  </article>
</main>`;

describe("YucAdapter offline candidate contract", () => {
  it.each([
    '<main data-yuc-list="true"><article data-yuc-entry="true"></article></main>',
    '<main data-yuc-list="true"><article data-yuc-entry data-entity-id="x" data-title="X">',
    '<main data-yuc-list="true">',
    '<main data-yuc-list="false"></main>',
    '<main data-yuc-list="true"><div data-yuc-entry="true"></div></main>',
    '<main data-yuc-list="true"><article data-yuc-entry></article></main>',
  ])("rejects malformed or truncated lists instead of empty success: %s", async (body) => {
    const adapter = new YucAdapter({
      enabled: true,
      sourcePageUrl,
      fetcher: async () => response(200, body),
      policy: { minIntervalMs: 0, maxRetries: 0 },
    });
    const store = new InMemoryYucCandidateStore();
    const existing = parseYucHtml(fixture, sourcePageUrl, "2026-10-01T00:00:00Z")[0]!;
    store.stage(existing);
    const result = await adapter.sync(store);
    expect(result).toMatchObject({
      status: "failed",
      reason: "invalid-response",
      emptyResult: false,
      stagedCount: 0,
    });
    expect(store.listCandidates()).toEqual([existing]);
  });

  it.each([
    ["date", 'data-date="2026-08-02"', 'data-date="2026-08-03"', "releaseDate"],
    ["quarter", 'data-quarter="summer"', 'data-quarter="autumn"', "season"],
    ["year", 'data-year="2026"', 'data-year="2027"', "season"],
    ["title", 'data-title="星光备忘录"', 'data-title="修订标题"', "title"],
    ["tentative", 'data-time="25:15"', 'data-time="25:15" data-tentative="true"', "broadcast"],
  ])(
    "keeps %s revisions on the same entity and preserves verified data",
    (_name, from, to, field) => {
      const first = parseYucHtml(fixture, sourcePageUrl, "2026-10-01T00:00:00Z")[0]!;
      const revision = parseYucHtml(
        fixture.replace(from!, to!),
        sourcePageUrl,
        "2026-10-01T01:00:00Z",
      )[0]!;
      expect(revision.stableKey).toBe(first.stableKey);
      expect(revision.sourceRecordId).not.toBe(first.sourceRecordId);
      const store = new InMemoryYucCandidateStore();
      store.stage(first);
      expect(store.promote(first.sourceRecordId).status).toBe("merged");
      const before = store.getVerified(first.stableKey);
      expect(store.stage(revision).status).toBe("staged");
      expect(store.promote(revision.sourceRecordId)).toMatchObject({
        status: "conflict",
        conflicts: expect.arrayContaining([field]),
      });
      expect(store.getVerified(first.stableKey)).toEqual(before);
      expect(store.listCandidates()).toHaveLength(2);
    },
  );

  it("distinguishes same-title entities and refuses to guess a missing source identity", () => {
    const first = parseYucHtml(fixture, sourcePageUrl, "2026-10-01T00:00:00Z")[0]!;
    const other = parseYucHtml(
      fixture.replace('data-entity-id="synthetic-a"', 'data-entity-id="synthetic-b"'),
      sourcePageUrl,
      "2026-10-01T00:00:00Z",
    )[0]!;
    expect(first.stableKey).not.toBe(other.stableKey);
    expect(first.sourceRecordId).not.toBe(other.sourceRecordId);
    expect(() =>
      parseYucHtml(
        fixture.replace('data-entity-id="synthetic-a"', ""),
        sourcePageUrl,
        "2026-10-01T00:00:00Z",
      ),
    ).toThrow();
  });

  it("stops queued run and sync calls after the first failure opens the circuit", async () => {
    let calls = 0;
    const store = new InMemoryYucCandidateStore();
    const adapter = new YucAdapter({
      enabled: true,
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0, circuitFailureThreshold: 1 },
      fetcher: async () => {
        calls += 1;
        return response(500);
      },
    });
    const results = await Promise.all([adapter.run(), adapter.sync(store), adapter.run()]);
    expect(calls).toBe(1);
    expect(results.map(({ reason, requestCount }) => ({ reason, requestCount }))).toEqual([
      { reason: "http-error", requestCount: 1 },
      { reason: "circuit-open", requestCount: 0 },
      { reason: "circuit-open", requestCount: 0 },
    ]);
    expect(store.listCandidates()).toEqual([]);
  });

  it("isolates nested snapshots from both input and query mutations", () => {
    const input = parseYucHtml(fixture, sourcePageUrl, "2026-10-01T00:00:00Z")[0]!;
    const expected = structuredClone(input);
    const store = new InMemoryYucCandidateStore();
    store.stage(input);
    input.fields.title = "changed input";
    input.fields.broadcast.parsedTime!.hour = 9;
    input.provenance[0]!.rawValue = "changed evidence";
    expect(store.listCandidates()).toEqual([expected]);
    const returned = store.listCandidates()[0]!;
    returned.fields.title = "changed output";
    returned.fields.broadcast.parsedTime!.minute = 59;
    returned.provenance[0]!.rawValue = "changed output evidence";
    expect(store.listCandidates()).toEqual([expected]);
  });

  it("validates direct store writes before changing existing candidates", () => {
    const record = parseYucHtml(fixture, sourcePageUrl, "2026-10-01T00:00:00Z")[0]!;
    const store = new InMemoryYucCandidateStore();
    store.stage(record);
    const before = store.listCandidates();
    const invalidInputs = [
      { ...record, imageUrl: "https://example.invalid/image" },
      { ...record, fields: { ...record.fields, description: "forbidden" } },
      { ...record, sourcePageUrl: "https://example.invalid/new/" },
      { ...record, validationStatus: "verified" },
      { ...record, publicVisibility: "public" },
      { ...record, fields: { ...record.fields, title: "unversioned mutation" } },
      {
        ...record,
        fields: {
          ...record.fields,
          broadcast: {
            ...record.fields.broadcast,
            parsedTime: { hour: 1, minute: 15, dayOffset: 1, imageUrl: "forbidden" },
          },
        },
      },
    ];
    for (const input of invalidInputs) {
      expect(() => store.stage(input as typeof record)).toThrow();
      expect(store.listCandidates()).toEqual(before);
    }
  });

  it("checks a disabled switch when a queued call reaches the request boundary", async () => {
    const options = {
      enabled: true,
      sourcePageUrl,
      fetcher: async () => response(200, fixture),
      policy: { minIntervalMs: 0, maxRetries: 0 },
    };
    const adapter = new YucAdapter(options);
    const queued = adapter.run();
    options.enabled = false;
    expect(await queued).toMatchObject({ status: "disabled", requestCount: 0 });
  });

  it("maps only approved metadata and preserves 25:15 as next-day raw time", async () => {
    const calls: string[] = [];
    const fetcher: YucFetcher = async (url) => {
      calls.push(url);
      return response(200, fixture);
    };

    const result = await new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl,
      now: () => "2026-09-15T06:00:00.000Z",
      policy: { minIntervalMs: 0 },
    }).run();

    expect(calls).toEqual([sourcePageUrl]);
    expect(result.status).toBe("success");
    expect(result.records).toHaveLength(1);
    const record = result.records[0];
    expect(record?.sourcePageUrl).toBe(sourcePageUrl);
    expect(record?.publicVisibility).toBe("internal-only");
    expect(record?.fields.title).toBe("星光备忘录");
    expect(record?.fields.broadcast.rawTimeText).toBe("25:15");
    expect(record?.fields.broadcast.timeStatus).toBe("known");
    expect(record?.fields.broadcast.parsedTime).toEqual({
      hour: 1,
      minute: 15,
      dayOffset: 1,
    });
    expect(record).not.toHaveProperty("description");
    expect(record).not.toHaveProperty("imageUrl");
    expect(record).not.toHaveProperty("externalLinks");
    expect(record?.provenance.every((item) => item.sourcePageUrl === sourcePageUrl)).toBe(true);
  });

  it("keeps missing timezone unknown and keeps tentative time unnormalized", async () => {
    const fetcher: YucFetcher = async () =>
      response(
        200,
        `<article data-yuc-entry data-entity-id="synthetic-tentative" data-title="待定作品" data-date="2026-10-01" data-time="24:00" data-tentative="true" data-year="2026" data-quarter="autumn"></article>`,
      );

    const tentative = await new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl,
      policy: { minIntervalMs: 0 },
    }).run();
    expect(tentative.records[0]?.fields.broadcast.timeStatus).toBe("tentative");
    expect(tentative.records[0]?.fields.broadcast.normalizedStartAt).toBeNull();

    const missingTimezone = await new YucAdapter({
      enabled: true,
      fetcher: async () =>
        response(
          200,
          `<article data-yuc-entry data-entity-id="synthetic-unknown" data-title="未知时区" data-date="2026-10-01" data-time="24:00"></article>`,
        ),
      sourcePageUrl,
      policy: { minIntervalMs: 0 },
    }).run();
    expect(missingTimezone.records[0]?.fields.broadcast.timeStatus).toBe("unknown");
    expect(missingTimezone.records[0]?.fields.broadcast.normalizedStartAt).toBeNull();
  });

  it("makes the disabled source produce zero requests", async () => {
    let requestCount = 0;
    const result = await new YucAdapter({
      enabled: false,
      fetcher: async () => {
        requestCount += 1;
        return response(200, fixture);
      },
      sourcePageUrl,
    }).run();

    expect(requestCount).toBe(0);
    expect(result).toMatchObject({ status: "disabled", requestCount: 0, records: [] });
  });

  it("rejects a non-YUC page URL at the source boundary", () => {
    expect(
      () =>
        new YucAdapter({
          enabled: true,
          fetcher: async () => response(200, fixture),
          sourcePageUrl: "https://third-party.example/page",
        }),
    ).toThrow("YUC adapter only accepts pages under https://yuc.wiki");
  });

  it("rejects lookalike origins, credentials, ports, and unapproved paths", () => {
    for (const invalidUrl of [
      "https://yuc.wiki.evil.example/new/",
      "https://user:pass@yuc.wiki/new/",
      "https://yuc.wiki:444/new/",
      "https://yuc.wiki/private/",
    ]) {
      expect(
        () =>
          new YucAdapter({
            enabled: true,
            fetcher: async () => response(200, fixture),
            sourcePageUrl: invalidUrl,
          }),
      ).toThrow("YUC adapter only accepts pages under https://yuc.wiki");
    }
  });

  it("does not mutate verified data on duplicate import or conflict", async () => {
    const fetcher: YucFetcher = async () => response(200, fixture);
    const adapter = new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl,
      policy: { minIntervalMs: 0 },
    });
    const first = await adapter.run();
    const record = first.records[0];
    expect(record).toBeDefined();

    const store = new InMemoryYucCandidateStore();
    store.setVerified({
      stableKey: record!.stableKey,
      title: "官方星光备忘录",
      broadcastExpression: "日本时间 周日 25:15",
    });
    expect(store.stage(record!).status).toBe("staged");
    expect(store.stage(record!).status).toBe("duplicate");

    const before = store.getVerified(record!.stableKey);
    const merge = store.promote(record!.sourceRecordId);
    expect(merge.status).toBe("conflict");
    expect(store.getVerified(record!.stableKey)).toEqual(before);
    expect(store.listCandidates()).toHaveLength(1);
  });

  it("retries transient failures with backoff but does not retry 403 or 429", async () => {
    const sleeps: number[] = [];
    let attempt = 0;
    const result = await new YucAdapter({
      enabled: true,
      fetcher: async () => {
        attempt += 1;
        return attempt === 1 ? response(503) : response(200, fixture);
      },
      sourcePageUrl,
      sleep: async (ms) => sleeps.push(ms),
      policy: { minIntervalMs: 0, maxRetries: 1, backoffMs: 100, jitterMs: 0 },
    }).run();
    expect(result.status).toBe("success");
    expect(result.requestCount).toBe(2);
    expect(sleeps).toEqual([100]);

    const forbidden = await new YucAdapter({
      enabled: true,
      fetcher: async () => response(403),
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 1 },
    }).run();
    expect(forbidden).toMatchObject({ status: "failed", reason: "forbidden", requestCount: 1 });

    const rateLimited = await new YucAdapter({
      enabled: true,
      fetcher: async () => response(429),
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 1 },
    }).run();
    expect(rateLimited).toMatchObject({
      status: "failed",
      reason: "rate-limited",
      requestCount: 1,
    });
  });

  it("serializes overlapping run and sync calls for one source", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetcher: YucFetcher = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return response(200, fixture);
    };
    const adapter = new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0 },
    });
    const store = new InMemoryYucCandidateStore();

    await Promise.all([adapter.run(), adapter.run(), adapter.sync(store)]);
    expect(maxInFlight).toBe(1);
    expect(store.listCandidates()).toHaveLength(1);
  });

  it("shares the concurrency boundary across adapter instances for one origin", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetcher: YucFetcher = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return response(200, fixture);
    };
    const first = new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl: "https://yuc.wiki/new/",
      policy: { minIntervalMs: 0, maxRetries: 0 },
    });
    const second = new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl: "https://yuc.wiki/sp/",
      policy: { minIntervalMs: 0, maxRetries: 0 },
    });

    await Promise.all([first.run(), second.run()]);
    expect(maxInFlight).toBe(1);
  });

  it("keeps a changed source version instead of treating it as an idempotent duplicate", async () => {
    const revisedFixture = fixture
      .replace('data-timezone="Asia/Tokyo"', 'data-timezone="Asia/Shanghai" data-tentative="true"')
      .replace('data-quarter="summer"', 'data-quarter="summer"');
    const bodies = [fixture, revisedFixture];
    const adapter = new YucAdapter({
      enabled: true,
      fetcher: async () => response(200, bodies.shift() ?? revisedFixture),
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0 },
    });
    const first = await adapter.run();
    const second = await adapter.run();
    const store = new InMemoryYucCandidateStore();

    expect(first.records[0]?.sourceRecordId).not.toBe(second.records[0]?.sourceRecordId);
    expect(first.records[0]?.stableKey).toBe(second.records[0]?.stableKey);
    expect(store.stage(first.records[0]!).status).toBe("staged");
    expect(store.stage(second.records[0]!).status).toBe("staged");
    expect(store.listCandidates()).toHaveLength(2);
  });

  it("rejects invalid dates and timezones without calling them known", async () => {
    const invalid = fixture
      .replace('data-date="2026-08-02"', 'data-date="2026-02-31"')
      .replace('data-timezone="Asia/Tokyo"', 'data-timezone="Not/A_Timezone"');
    const result = await new YucAdapter({
      enabled: true,
      fetcher: async () => response(200, invalid),
      sourcePageUrl,
      policy: { minIntervalMs: 0 },
    }).run();

    expect(result.records[0]?.fields.broadcast.rawDateText).toBe("2026-02-31");
    expect(result.records[0]?.fields.broadcast.rawTimezoneText).toBe("Not/A_Timezone");
    expect(result.records[0]?.fields.broadcast.timeStatus).toBe("unknown");
    expect(result.records[0]?.fields.releaseDate.normalizedDate).toBeNull();
  });

  it("distinguishes a declared empty list from an unrecognized response and preserves failures", async () => {
    const empty = await new YucAdapter({
      enabled: true,
      fetcher: async () => response(200, '<main data-yuc-list="true"></main>'),
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0 },
    }).run();
    expect(empty).toMatchObject({ status: "success", emptyResult: true, requestCount: 1 });

    const store = new InMemoryYucCandidateStore();
    const seeded = await new YucAdapter({
      enabled: true,
      fetcher: async () => response(200, fixture),
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0 },
    }).run();
    store.stage(seeded.records[0]!);
    const failing = new YucAdapter({
      enabled: true,
      fetcher: async () => response(200, "<html>unexpected structure</html>"),
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0, circuitFailureThreshold: 2 },
    });

    const first = await failing.sync(store);
    expect(first).toMatchObject({ status: "failed", reason: "invalid-response", stagedCount: 0 });
    expect(store.listCandidates()).toHaveLength(1);
    expect((await failing.run()).reason).toBe("invalid-response");
    expect(await failing.run()).toMatchObject({
      status: "failed",
      reason: "circuit-open",
      requestCount: 0,
    });
  });

  it("rejects a malformed HTTP response at runtime", async () => {
    const result = await new YucAdapter({
      enabled: true,
      fetcher: async () =>
        ({ status: "200", body: fixture, headers: {} }) as unknown as Awaited<
          ReturnType<YucFetcher>
        >,
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0 },
    }).run();

    expect(result).toMatchObject({ status: "failed", reason: "invalid-response", requestCount: 1 });
  });

  it("enforces the configured per-origin request interval without real network access", async () => {
    let nowMs = 0;
    const sleeps: number[] = [];
    const adapter = new YucAdapter({
      enabled: true,
      fetcher: async () => response(200, fixture),
      sourcePageUrl,
      now: () => new Date(nowMs).toISOString(),
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
        nowMs += milliseconds;
      },
      policy: { minIntervalMs: 100, maxRetries: 0 },
    });

    await adapter.run();
    await adapter.run();
    expect(sleeps).toEqual([100]);
  });

  it("maps timeout, trips a circuit after repeated failures, and preserves existing candidates", async () => {
    const store = new InMemoryYucCandidateStore();
    const fetcher: YucFetcher = async () => response(200, fixture);
    const seeded = await new YucAdapter({
      enabled: true,
      fetcher,
      sourcePageUrl,
      policy: { minIntervalMs: 0 },
    }).run();
    store.stage(seeded.records[0]!);

    const failingFetcher: YucFetcher = async () => response(500);
    const failing = new YucAdapter({
      enabled: true,
      fetcher: failingFetcher,
      sourcePageUrl,
      policy: { minIntervalMs: 0, maxRetries: 0, circuitFailureThreshold: 2 },
    });
    expect((await failing.run()).reason).toBe("http-error");
    expect((await failing.run()).reason).toBe("http-error");
    expect(await failing.run()).toMatchObject({
      status: "failed",
      reason: "circuit-open",
      requestCount: 0,
    });

    const timeout = new YucAdapter({
      enabled: true,
      fetcher: async () => new Promise(() => undefined),
      sourcePageUrl,
      policy: { minIntervalMs: 0, timeoutMs: 5, maxRetries: 0 },
    });
    await expect(timeout.run()).resolves.toMatchObject({
      status: "failed",
      reason: "timeout",
      requestCount: 1,
    });
    expect(store.listCandidates()).toHaveLength(1);
  });
});
