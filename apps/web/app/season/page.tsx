import { Container } from "@menghuan/ui";
import { SeasonClient } from "@/components/season-client";
import { getAnimeRepository } from "@/server/anime-repository";
import { SyntheticBanner } from "@/components/synthetic-banner";

export const dynamic = "force-dynamic";

export default async function SeasonPage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  return (
    <Container className="page-shell">
      <SyntheticBanner />
      <header className="page-header">
        <h1>季度新番</h1>
        <p>按资料中记录的年份与季度，浏览当前、历史和未来作品。</p>
      </header>
      <SeasonClient records={records} />
    </Container>
  );
}
