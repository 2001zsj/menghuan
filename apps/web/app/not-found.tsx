import Link from "next/link";
import { Container } from "@menghuan/ui";
export default function NotFoundPage() {
  return (
    <Container className="page-shell state-page">
      <span className="hero__eyebrow">404 / Archive Missing</span>
      <h1>这份档案不存在</h1>
      <p>可能是Mock条目已移动，或地址并未被阶段2页面骨架收录。</p>
      <Link href="/">返回首页</Link>
    </Container>
  );
}
