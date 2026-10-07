import { z } from "zod";
import { stage3AnimeFixture } from "../fixtures/stage3.js";
import { animePageDataSchema } from "../schemas.js";
import { parseYucHtml, yucSourceRecordSchema } from "./yuc.js";

export const syntheticCandidateSchema = z
  .object({
    kind: z.literal("synthetic"),
    fixtureCreatedAt: z.string().datetime(),
    record: yucSourceRecordSchema,
  })
  .strict();

export function createSyntheticFlowSamples() {
  const capturedAt = "2026-07-01T00:00:00Z"; // Synthetic fixture creation, not a website fetch.
  return ["starlight-memo", "night-tram", "rain-library"].map((slug, index) => {
    const page = structuredClone(stage3AnimeFixture.find((item) => item.anime.slug === slug)!);
    const entity = `local-synthetic-${index + 1}`;
    const title =
      index === 2
        ? "合成·雨幕图书室——当所有尚未确定的放送时刻都等待确认的漫长夏日"
        : `合成·${page.anime.title}`;
    const rawTime = page.broadcast?.sourceOriginalTimeText ?? "";
    const record = parseYucHtml(
      `<article data-yuc-entry data-entity-id="${entity}" data-title="${title}" data-date="${index === 0 ? "2026-07-28" : index === 1 ? "2026-08-02" : "2026-07-27"}" data-time="${rawTime}" data-timezone="${page.broadcast?.sourceTimezone ?? ""}" data-tentative="${page.broadcast?.isTentative ?? false}" data-year="2026" data-quarter="summer"></article>`,
      "https://yuc.wiki/202610/",
      capturedAt,
    )[0]!;
    page.anime.id = `synthetic-yuc-${index + 1}`;
    page.anime.slug = `synthetic-yuc-${index + 1}`;
    page.anime.title = title;
    page.anime.synopsis = "自行编写的合成演示资料，不是YUC真实简介。";
    page.anime.tags = ["合成演示"];
    page.anime.isMock = true;
    if (page.broadcast) page.broadcast.animeId = page.anime.id;
    if (page.animeSeason) page.animeSeason.animeId = page.anime.id;
    page.resourceCategories = [];
    page.syntheticSource = {
      kind: "synthetic",
      entityId: entity,
      fixtureUrl: "https://example.org/menghuan/synthetic",
      targetExplanation: "YUC适配流程演示 · 非官方",
      originalExpression: record.fields.broadcast.originalExpression,
      mappingReason:
        "人工确认的本地合成映射；放送模型复用Stage4受控Fixture时间，不代表真实页面证据。",
    };
    return {
      ...syntheticCandidateSchema.parse({
        kind: "synthetic",
        fixtureCreatedAt: capturedAt,
        record,
      }),
      page: animePageDataSchema.parse(page),
    };
  });
}
