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
        <p>
          “今日”由Stage4受控Reference Instant在所选展示时区中的日历日期决定，不读取现实系统日期。
        </p>
      </header>
      <TodayClient items={items} />
    </Container>
  );
}
