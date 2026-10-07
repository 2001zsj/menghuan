import { Container } from "@menghuan/ui";
import { TodayClient } from "@/components/today-client";
import { getAnimeRepository } from "@/server/anime-repository";
import { SyntheticBanner } from "@/components/synthetic-banner";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const repository = await getAnimeRepository();
  const items = await repository.listAnime();
  return (
    <Container className="page-shell discovery-page">
      <SyntheticBanner />
      <header className="page-header">
        <h1>今日更新</h1>
        <p>按演示日期查看更新与放送时间。</p>
      </header>
      <TodayClient items={items} />
    </Container>
  );
}
