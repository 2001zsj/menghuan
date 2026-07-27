import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
