import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DiscoveryError from "../../app/error";
import { DemoNotice } from "@/components/demo-notice";
import {
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  PosterPlaceholder,
  SectionHeader,
  Skeleton,
  Tabs,
} from "@menghuan/ui";

describe("UI foundation components", () => {
  it("labels each mode once, keeps explanations collapsed and distinguishes simulated from adopted data", () => {
    const off = renderToStaticMarkup(<DemoNotice mode="off" enabled={false} />);
    expect(off).toContain("演示资料 · 完全虚构作品");
    expect(off).not.toContain("synthetic-banner");
    expect(off).not.toContain("来源已关闭");
    for (const mode of ["mock", "database"] as const) {
      const html = renderToStaticMarkup(<DemoNotice mode={mode} enabled={true} />);
      expect(html.match(/<aside/g)).toHaveLength(1);
      expect(html).toContain("合成演示数据 · 非真实YUC资料");
      expect(html).not.toContain("open=");
      expect(html).toContain(mode === "mock" ? "未连接数据库" : "仅展示已确认采用的资料");
      expect(html).not.toContain("测试库");
    }
    expect(renderToStaticMarkup(<DemoNotice mode="database" enabled={false} />)).toContain(
      "已采用资料仍保留",
    );
  });
  it("off mode error offers mode-neutral recovery without blaming a demo database", () => {
    vi.stubEnv("MENGHUAN_SYNTHETIC_MODE", "off");
    try {
      const html = renderToStaticMarkup(<DiscoveryError />);
      expect(html).toContain("资料加载失败");
      expect(html).toContain("请稍后重新加载");
      expect(html).toContain("重新加载");
      expect(html).not.toContain("本地演示数据库");
      expect(html).not.toContain("postgresql://");
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("renders foundational components to static markup", () => {
    const html = renderToStaticMarkup(
      <Container>
        <SectionHeader title="档案" description="说明" />
        <Card>
          <Badge tone="accent">Mock</Badge>
          <PosterPlaceholder title="月灯档案馆" />
          <Button>打开</Button>
          <Skeleton />
          <EmptyState title="为空" description="暂无内容" />
        </Card>
      </Container>,
    );

    expect(html).toContain("mh-container");
    expect(html).toContain("月灯档案馆的抽象占位海报");
    expect(html).toContain("打开");
  });

  it("renders weekday filtering as pressed buttons instead of incomplete tabs", () => {
    const html = renderToStaticMarkup(
      <Tabs
        label="选择星期"
        value="mon"
        options={[
          { value: "mon", label: "周一" },
          { value: "tue", label: "周二" },
        ]}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain("<fieldset");
    expect(html).toContain("选择星期");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("aria-selected");
  });
});
