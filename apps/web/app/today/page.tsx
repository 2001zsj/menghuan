import { Container } from "@menghuan/ui";
import { MockBanner } from "@/components/mock-banner";
import { TodayClient } from "@/components/today-client";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function TodayPage() {
  const repository = await getAnimeRepository();
  const items = await repository.listAnime();
  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>今日更新</h1>
        <p>按演示状态分组，同时展示换算时间和不可覆盖的原始来源时间。</p>
      </header>
      <TodayClient items={items} />
    </Container>
  );
}
