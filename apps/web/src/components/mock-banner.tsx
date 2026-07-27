import { Badge } from "@menghuan/ui";
import { stage2MockNotice } from "@/mocks/stage2";
export function MockBanner() {
  return (
    <aside className="mock-banner" aria-label="Mock数据提示">
      <Badge tone="warning">Stage 2 Mock</Badge>
      <p>{stage2MockNotice}</p>
    </aside>
  );
}
