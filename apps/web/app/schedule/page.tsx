import { Container } from "@menghuan/ui";
import { ScheduleClient } from "@/components/schedule-client";
import { getAnimeRepository } from "@/server/anime-repository";
import { SyntheticBanner } from "@/components/synthetic-banner";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const repository = await getAnimeRepository();
  const items = await repository.listAnime();
  return (
    <Container className="page-shell discovery-page">
      <SyntheticBanner />
      <header className="page-header">
        <h1>每周放送表</h1>
        <p>选择星期，查看本季放送安排。</p>
      </header>
      <ScheduleClient items={items} />
    </Container>
  );
}
