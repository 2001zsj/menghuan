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
        <p>以视觉筛选骨架验证年份、季度、类型和状态的组合关系。</p>
      </header>
      <SeasonClient records={records} />
    </Container>
  );
}
