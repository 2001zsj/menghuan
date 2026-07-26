import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>梦幻</h1>
      <p>当前状态：工程初始化阶段</p>
      <p>阶段编号：Stage 1</p>
      <p>
        <Link href="/health">打开健康页</Link>
      </p>
      <p>
        <strong>当前不是正式网站首页。</strong>
      </p>
    </main>
  );
}
