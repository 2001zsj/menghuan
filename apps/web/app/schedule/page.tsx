import { Container } from "@menghuan/ui";
import { MockBanner } from "@/components/mock-banner";
import { ScheduleClient } from "@/components/schedule-client";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function SchedulePage() {
  const repository = await getAnimeRepository();
  const items = await repository.listAnime();
  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>每周放送表</h1>
        <p>当前季度记录按展示时区重新归入星期；深夜原文、跨日与未定时间分别保留。</p>
      </header>
      <ScheduleClient items={items} />
    </Container>
  );
}
