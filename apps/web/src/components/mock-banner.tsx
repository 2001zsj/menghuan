import { STAGE4_FIXTURE_NOTICE } from "@menghuan/domain";
import { Badge } from "@menghuan/ui";

export function MockBanner() {
  return (
    <aside className="mock-banner" aria-label="受控Fixture提示">
      <Badge tone="warning">Stage 4 Fixture</Badge>
      <p>{STAGE4_FIXTURE_NOTICE.replace("当前页面使用10部", "Stage4基线使用10部")}</p>
    </aside>
  );
}
