import { Container } from "@menghuan/ui";
import { FavoritesClient } from "@/components/favorites-client";
import { MockBanner } from "@/components/mock-banner";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function FavoritesPage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>我的收藏</h1>
        <p>收藏仅保存在当前浏览器，不需要账户、登录、Session或服务端API。</p>
      </header>
      <aside className="favorites-note">
        <p>清除浏览器站点数据会同时清除收藏。本阶段不提供多设备同步。</p>
      </aside>
      <FavoritesClient records={records} />
    </Container>
  );
}
