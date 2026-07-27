import { notFound } from "next/navigation";
import { Container } from "@menghuan/ui";
import { AnimeDetailClient } from "@/components/detail-client";
import { MockBanner } from "@/components/mock-banner";
import { getMockAnimeBySlug, stage2MockAnime } from "@/mocks/stage2";
export function generateStaticParams() {
  return stage2MockAnime.map((anime) => ({ slug: anime.slug }));
}
export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = getMockAnimeBySlug(slug);
  if (!anime) notFound();
  return (
    <Container className="page-shell">
      <MockBanner />
      <AnimeDetailClient anime={anime} />
    </Container>
  );
}
