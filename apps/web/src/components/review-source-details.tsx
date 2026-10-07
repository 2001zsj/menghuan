import type { AnimePageData } from "@menghuan/domain";
const labels: Record<string, string> = {
  title: "标题",
  date: "日期",
  time: "原始时间",
  timezone: "时区",
  year: "年份",
  quarter: "季度",
  status: "时间状态",
};
export function ReviewSourceDetails({ source }: { source: AnimePageData["reviewSource"] }) {
  if (!source) return null;
  return (
    <details className="synthetic-source" data-testid="review-source-details">
      <summary>{source.label}</summary>
      <div>
        <p>
          {source.dataNature === "real"
            ? "单次获准观察，经 Codex 工程身份审核及逐字段采用；仅限本机非商业评估，不代表官方身份验证。"
            : source.dataNature === "synthetic-path-test"
              ? "自行编写内容验证真实候选代码路径；没有请求 YUC。"
              : "自行编写的测试观察，经人工身份关联及逐字段采用；没有请求 YUC。"}
        </p>
        <p>
          已采用：{source.adoptedFields.map((f) => labels[f]).join("、")}
          。其余字段不因身份关联自动采用。
        </p>
        <p>原始表达：{source.originalExpression}</p>
        {source.dataNature === "real" ? (
          <p>
            来源页：{source.sourcePageUrl}；出处 Yuc's Anime List（署名：長門有C）。站点声明
            BY-NC-SA 4.0（特别声明除外）；本轮仅内部非商业评估，不公开展示或转载正文。
          </p>
        ) : (
          <p>适配目标页：{source.sourcePageUrl}（不是本资料出处）</p>
        )}
        {!source.sourceEnabled ? (
          <p role="status">来源已关闭，已采用资料保留。撤回由独立审核操作完成。</p>
        ) : null}
        <p>未决冲突保留原值，不展示未采用候选；缺失的年份与时区不推断。</p>
      </div>
    </details>
  );
}
