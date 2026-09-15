import Link from "next/link";
import { Container } from "@menghuan/ui";
export default function NotFoundPage() {
  return (
    <Container className="page-shell state-page">
      <span className="hero__eyebrow">404 / Archive Missing</span>
      <h1>这份档案不存在</h1>
      <p>可能是受控Fixture条目已移动，或当前档案中不存在这个地址。</p>
      <Link href="/">返回首页</Link>
    </Container>
  );
}
