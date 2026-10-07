import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PosterPlaceholder, AnimeCard } from "@menghuan/ui";
import { ReviewSourceDetails } from "@/components/review-source-details";
it("authored real-label projection never claims all real content is fictitious or Mock", () => {
  const source = {
    kind: "review-mapped" as const,
    dataNature: "real" as const,
    label: "YUC 独立来源 / 非官方 · 本地评估" as const,
    sourcePageUrl: "https://yuc.wiki/202610/" as const,
    sourceEnabled: false,
    adoptedFields: ["time" as const],
    originalExpression: "25:15",
  };
  const html = renderToStaticMarkup(<ReviewSourceDetails source={source} />);
  expect(html).toContain("長門有C");
  expect(html).toContain("BY-NC-SA 4.0");
  expect(html).not.toContain("自行编写");
  expect(html).toContain("来源已关闭");
  expect(
    renderToStaticMarkup(<PosterPlaceholder title="仅为合成输入" isMock={false} />),
  ).not.toContain("MOCK ARCHIVE");
  const card = renderToStaticMarkup(
    <AnimeCard
      title="仅为合成输入"
      href="/"
      status="未核验"
      format="未核验"
      tags={[]}
      isMock={false}
    />,
  );
  expect(card).toContain("本地评估");
  expect(card).not.toContain("Mock");
});
