export function DemoNotice({
  mode,
  enabled,
}: {
  mode: "off" | "mock" | "database";
  enabled: boolean;
}) {
  const synthetic = mode !== "off";
  return (
    <aside
      className="demo-notice"
      aria-label="演示资料说明"
      {...(synthetic ? { "data-testid": "synthetic-banner" } : {})}
    >
      <strong>{synthetic ? "合成演示数据 · 非真实YUC资料" : "演示资料 · 完全虚构作品"}</strong>
      <details>
        <summary>演示说明</summary>
        <p>基础资料为10部完全虚构作品。演示日期固定，不代表现实中的今天。</p>
        {synthetic ? (
          <p>
            {mode === "mock"
              ? "模拟预览，未连接数据库。"
              : "本地合成演示，仅展示已确认采用的资料。"}{" "}
            YUC是适配目标，不是这些资料的出处，亦非官方资料。
          </p>
        ) : null}
      </details>
      {synthetic && !enabled ? <p role="status">来源已关闭，已采用资料仍保留。</p> : null}
    </aside>
  );
}
