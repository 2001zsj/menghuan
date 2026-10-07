import { syntheticDemoState } from "@/server/synthetic-demo";
import { DemoNotice } from "./demo-notice";
import { realReviewState } from "@/server/real-review";
import { getServerEnvironment } from "@menghuan/config";

export async function SyntheticBanner() {
  if (getServerEnvironment().MENGHUAN_PREVIEW_REVIEW_MODE === "synthetic-readonly")
    return <DemoNotice mode="mock" enabled={false} />;
  const real = await realReviewState();
  if (real)
    return (
      <aside className="demo-notice" aria-label="本地评估范围" data-testid="real-local-banner">
        <strong>
          {real.dataNature === "real"
            ? "YUC 独立来源 / 非官方 · 本地评估"
            : "真实路径合成测试 · 非真实 YUC 资料"}
        </strong>
        <details>
          <summary>评估说明</summary>
          <p>
            基础10部作品仍为完全虚构演示。新增记录逐条标明性质，仅限本机非商业评估；缺失时区与年份不推断。
          </p>
          <p>只展示显式采用字段，不代表公共展示准入；会话到期后隐藏并须清理。</p>
        </details>
        {!real.enabled ? <p role="status">来源已关闭，已采用资料仍保留。</p> : null}
        {real.expired ? <p role="status">会话已到期，评估记录已隐藏。</p> : null}
      </aside>
    );
  const state = await syntheticDemoState();
  return <DemoNotice mode={state.mode} enabled={state.enabled} />;
}
