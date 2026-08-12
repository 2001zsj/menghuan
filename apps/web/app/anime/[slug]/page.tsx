import { notFound } from "next/navigation";
import { Container } from "@menghuan/ui";
import { AnimeDetailClient } from "@/components/detail-client";
import { MockBanner } from "@/components/mock-banner";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repository = await getAnimeRepository();
  const item = await repository.getAnimeBySlug(slug);
  if (!item) notFound();

  return (
    <Container className="page-shell">
      <MockBanner />
      <AnimeDetailClient item={item} />
    </Container>
  );
}
