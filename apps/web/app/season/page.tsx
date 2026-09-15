import { Container } from "@menghuan/ui";
import { MockBanner } from "@/components/mock-banner";
import { SeasonClient } from "@/components/season-client";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function SeasonPage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>季度新番</h1>
        <p>在当前、历史与未来季度之间切换；年份和季度选项均从受控Fixture的Season关系派生。</p>
      </header>
      <SeasonClient records={records} />
    </Container>
  );
}
