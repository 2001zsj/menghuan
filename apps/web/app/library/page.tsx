import { Container } from "@menghuan/ui";
import { LibraryClient } from "@/components/library-client";
import { SyntheticBanner } from "@/components/synthetic-banner";
import { getAnimeRepository } from "@/server/anime-repository";
import { getServerEnvironment } from "@menghuan/config";

export default async function LibraryPage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  return (
    <Container className="page-shell">
      <SyntheticBanner />
      <header className="page-header">
        <h1>番剧资料库</h1>
        <p>
          {getServerEnvironment().MENGHUAN_REAL_REVIEW_MODE !== "off"
            ? "当前仅为本机评估记录与虚构基础资料的浏览器内筛选，不是正式全局搜索。"
            : "当前仅为浏览器内Mock筛选，不是正式全局搜索，也不调用服务端搜索API。"}
        </p>
      </header>
      <LibraryClient records={records} />
    </Container>
  );
}
