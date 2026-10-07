import { YUC_OBSERVED_SYNTHETIC_HTML } from "../fixtures/yuc-observed.js";
import { stage3AnimeFixture } from "../fixtures/stage3.js";
import { animePageDataSchema } from "../schemas.js";
import { parseYucRealPage } from "./yuc-real.js";
import { parseYucHtml, yucSourceRecordSchema } from "./yuc.js";
import { syntheticCandidateSchema } from "./synthetic-flow.js";

/** Built-in authored values only; no caller-supplied real response can enter this local demo. */
export function createObservedSyntheticFlowSamples() {
  const at = "2026-10-04T00:00:00Z";
  const observed = parseYucRealPage(YUC_OBSERVED_SYNTHETIC_HTML, {
    sourceUrl: "https://yuc.wiki/202610/",
    observedAt: at,
  });
  return observed.candidates.map((candidate, index) => {
    const entity = `local-observed-shape-${index + 1}`;
    // An explicit local synthetic mapping, not a discovered website ID.
    const record = parseYucHtml(
      `<article data-yuc-entry data-entity-id="${entity}" data-title="${candidate.fields.title}" data-date="1/2(金)" data-time="25:15"></article>`,
      candidate.sourcePageUrl,
      at,
    )[0]!;
    record.provenance = candidate.provenance;
    const checked = yucSourceRecordSchema.parse(record);
    const page = structuredClone(stage3AnimeFixture[0]!);
    page.anime.id = `synthetic-observed-${index + 1}`;
    page.anime.slug = `synthetic-observed-${index + 1}`;
    page.anime.title = candidate.fields.title;
    page.anime.isMock = true;
    page.anime.aliases = [];
    page.anime.synopsis = "自行编写的匿名结构演示；不是YUC真实资料。";
    page.anime.tags = ["合成演示"];
    page.animeSeason = null;
    page.season = null;
    page.staffCredits = [];
    page.castCredits = [];
    page.episodes = [];
    page.resourceCategories = [];
    if (page.broadcast) {
      page.broadcast.animeId = page.anime.id;
      page.broadcast.sourceTimezone = null;
      page.broadcast.sourceOriginalDateText = checked.fields.broadcast.rawDateText;
      page.broadcast.sourceOriginalTimeText = checked.fields.broadcast.rawTimeText;
      page.broadcast.originalExpression = checked.fields.broadcast.originalExpression;
      page.broadcast.normalizedStartAt = null;
      page.broadcast.sourceWeekday = null;
      page.broadcast.availabilityState = "tbd";
      page.broadcast.isTentative = false;
      page.broadcast.note = "来源未明确年份或时区，不推定换算。";
    }
    page.syntheticSource = {
      kind: "synthetic",
      entityId: entity,
      fixtureUrl: "https://example.org/menghuan/synthetic",
      targetExplanation: "YUC适配流程演示 · 非官方",
      originalExpression: checked.fields.broadcast.originalExpression,
      mappingReason: "显式人工选择的本地合成身份；不是站点稳定ID，不按标题、日期或顺序自动合并。",
    };
    return {
      ...syntheticCandidateSchema.parse({
        kind: "synthetic",
        fixtureCreatedAt: at,
        record: checked,
      }),
      page: animePageDataSchema.parse(page),
      observation: candidate,
    };
  });
}
