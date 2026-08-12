import { Container } from "@menghuan/ui";
import { LibraryClient } from "@/components/library-client";
import { MockBanner } from "@/components/mock-banner";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function LibraryPage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>番剧资料库</h1>
        <p>当前仅为浏览器内Mock筛选，不是正式全局搜索，也不调用服务端搜索API。</p>
      </header>
      <LibraryClient records={records} />
    </Container>
  );
}
