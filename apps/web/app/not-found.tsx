import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main>
      <h1>页面不存在</h1>
      <p>该阶段仅提供工程健康基线。</p>
      <Link href="/">返回根页面</Link>
    </main>
  );
}
