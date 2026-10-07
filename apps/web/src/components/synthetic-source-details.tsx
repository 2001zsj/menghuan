import type { AnimePageData } from "@menghuan/domain";

export function SyntheticSourceDetails({ source }: { source: AnimePageData["syntheticSource"] }) {
  if (!source) return null;
  return (
    <details className="synthetic-source" data-testid="synthetic-source-details">
      <summary>来源说明 · 合成资料</summary>
      <div>
        <p>自行编写的合成资料，非YUC采集，非官方。</p>
        <p>原始字段表达：{source.originalExpression || "时间未知"}</p>
        <details>
          <summary>查看资料记录</summary>
          <p>适配目标：{source.targetExplanation}</p>
          <p>条目标识：{source.entityId}</p>
          <p>映射记录：{source.mappingReason}</p>
        </details>
        <p>
          示例来源页：
          <a href={source.fixtureUrl} rel="noreferrer">
            示例页面（非真实来源）
          </a>
        </p>
      </div>
    </details>
  );
}
