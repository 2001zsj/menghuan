import { expect, it } from "vitest";
import { parseYucRealPage } from "../src/sources/yuc-real";
import { InMemoryYucCandidateStore, parseYucHtml, YucAdapter } from "../src/sources/yuc";

const options = {
  sourceUrl: "https://yuc.wiki/202610/",
  observedAt: "2026-10-04T00:00:00Z",
  limit: 3,
};
const card =
  '<div><div class="div_date"><p>25:15</p><p>1/2(金)</p></div><div><table><tr><td>合成作品一</td></tr><tr><td><a href="https://third-party.invalid">禁止字段</a></td></tr></table></div></div>';
it("rejects body text nested inside the observed time field, not a contaminated pending candidate", () => {
  expect(() =>
    parseYucRealPage(
      card.replace("<p>25:15</p>", "<p>25:15<span>简介正文不应采集</span></p>"),
      options,
    ),
  ).toThrow("Date/time content structure changed");
});
it("rejects body text nested inside the observed date field", () => {
  expect(() =>
    parseYucRealPage(
      card.replace("<p>1/2(金)</p>", "<p>1/2(金)<span>额外正文不应采集</span></p>"),
      options,
    ),
  ).toThrow("Date/time content structure changed");
});
it.each([
  "<br>",
  "<a href='https://example.invalid'>资源</a>",
  "<img src='https://example.invalid/image'>",
])(
  "rejects unsupported nested time/date structures without selectively flattening them: %s",
  (content) => {
    for (const text of ["25:15", "1/2(金)"])
      expect(() =>
        parseYucRealPage(card.replace(`<p>${text}</p>`, `<p>${text}${content}</p>`), options),
      ).toThrow("Date/time content structure changed");
  },
);
it.each(["time", "date"])(
  "Adapter failure on contaminated %s returns no candidates and preserves already verified data",
  async (field) => {
    const store = new InMemoryYucCandidateStore();
    const verified = parseYucHtml(
      '<article data-yuc-entry data-entity-id="synthetic-verified" data-title="既有合成作品" data-date="2026-01-02" data-time="25:15" data-timezone="Asia/Tokyo"></article>',
      options.sourceUrl,
      options.observedAt,
    )[0]!;
    store.stage(verified);
    expect(store.promote(verified.sourceRecordId).status).toBe("merged");
    const before = {
      candidates: store.listCandidates(),
      verified: store.getVerified(verified.stableKey),
    };
    const text = field === "time" ? "25:15" : "1/2(金)";
    const body = card.replace(`<p>${text}</p>`, `<p>${text}<span>正文不应采集</span></p>`);
    const adapter = new YucAdapter({
      enabled: true,
      pageFormat: "observed-dom",
      sourcePageUrl: options.sourceUrl,
      fetcher: async () => ({ status: 200, body, headers: { "content-type": "text/html" } }),
      now: () => options.observedAt,
      policy: { maxRetries: 0, minIntervalMs: 0 },
    });
    const result = await adapter.sync(store);
    expect(result).toMatchObject({ status: "failed", records: [], stagedCount: 0 });
    expect(result.pendingCandidates ?? []).toEqual([]);
    expect({
      candidates: store.listCandidates(),
      verified: store.getVerified(verified.stableKey),
    }).toEqual(before);
    expect(JSON.stringify(result)).not.toContain("正文不应采集");
  },
);
it("observed DOM yields a title and preserved late-night time, never a guessed entity identity", () => {
  const result = parseYucRealPage("<main>" + card + "</main>", options);
  expect(result.candidates).toHaveLength(1);
  expect(result.candidates[0]).toMatchObject({
    identity: { status: "pending-review", sourceEntityId: null },
    fields: {
      title: "合成作品一",
      broadcast: {
        rawTimeText: "25:15",
        parsedTime: { hour: 1, minute: 15, dayOffset: 1 },
        rawTimezoneText: null,
        timeStatus: "unknown",
      },
      releaseDate: { normalizedDate: null },
      season: { year: null, quarter: null },
    },
  });
  expect(JSON.stringify(result)).not.toContain("third-party.invalid");
});
it("ignores the observed media sibling without allowing its address into candidates", () => {
  const result = parseYucRealPage(
    card.replace("</p></div>", '</p><img src="https://media.invalid/private"></div>'),
    options,
  );
  expect(result.candidates).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain("media.invalid");
});
it.each([
  "",
  "<main></main>",
  card.replace("div_date", "unexpected"),
  card.replace("<p>25:15</p>", "<span>25:15</span>"),
])("rejects missing or changed structure instead of successful empty data", (html) => {
  expect(() => parseYucRealPage(html, options)).toThrow();
});
it.each([
  "https://user:pass@yuc.wiki/202610/",
  "https://yuc.wiki.evil.invalid/202610/",
  "https://yuc.wiki/202607/",
  "https://yuc.wiki/202610/#fragment",
])("rejects an unapproved source identity %s", (sourceUrl) => {
  expect(() => parseYucRealPage(card, { ...options, sourceUrl })).toThrow();
});
it("keeps same-title and changed-date observations unmapped rather than inventing a stable entity", () => {
  const result = parseYucRealPage(card + card.replace("1/2(金)", "1/3(土)"), options);
  expect(result.candidates).toHaveLength(2);
  expect(result.candidates.every((c) => c.identity.sourceEntityId === null)).toBe(true);
  expect(result.candidates.map((c) => c.fields.releaseDate.rawText)).toEqual([
    "1/2(金)",
    "1/3(土)",
  ]);
});
it("retains invalid date and tentative expressions as unknown/tentative without guessing timezone or quarter", () => {
  const unknown = parseYucRealPage(card.replace("1/2(金)", "2026-02-30"), options).candidates[0]!;
  expect(unknown.fields.releaseDate.normalizedDate).toBeNull();
  expect(unknown.fields.broadcast.timeStatus).toBe("unknown");
  const tentative = parseYucRealPage(card.replace("25:15", "時間未定"), options).candidates[0]!;
  expect(tentative.fields.broadcast).toMatchObject({
    rawTimeText: "時間未定",
    timeStatus: "tentative",
    parsedTime: null,
    normalizedStartAt: null,
  });
});
it("real DOM Adapter stays disabled and never puts pending identity into the accepted store", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { status: 200, body: card, headers: { "content-type": "text/html" } };
  };
  const disabled = new YucAdapter({
    enabled: false,
    pageFormat: "observed-dom",
    sourcePageUrl: options.sourceUrl,
    fetcher,
  });
  expect((await disabled.run()).status).toBe("disabled");
  expect(calls).toBe(0);
  const store = new InMemoryYucCandidateStore();
  const adapter = new YucAdapter({
    enabled: true,
    pageFormat: "observed-dom",
    sourcePageUrl: options.sourceUrl,
    fetcher,
    now: () => options.observedAt,
    policy: { maxRetries: 0, minIntervalMs: 0 },
  });
  const result = await adapter.sync(store);
  expect(result).toMatchObject({
    status: "success",
    stagedCount: 0,
    records: [],
    emptyResult: false,
  });
  expect(result.pendingCandidates).toHaveLength(1);
  expect(() => store.stage(result.pendingCandidates![0])).toThrow();
});
it("rejects content-bearing structure changes in the observed title cell", () => {
  expect(() =>
    parseYucRealPage(card.replace("合成作品一", "合成作品一<p>简介不得入库</p>"), options),
  ).toThrow();
});
