import { STAGE3_FIXTURE_NOTICE } from "@menghuan/domain";
import { Badge } from "@menghuan/ui";

export function MockBanner() {
  return (
    <aside className="mock-banner" aria-label="Mock数据提示">
      <Badge tone="warning">Stage 3 Mock</Badge>
      <p>{STAGE3_FIXTURE_NOTICE}</p>
    </aside>
  );
}
