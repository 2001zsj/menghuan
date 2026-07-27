"use client";
import { Button, Container } from "@menghuan/ui";
export default function ErrorPage({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <Container className="page-shell state-page">
      <span className="hero__eyebrow">Temporary Error</span>
      <h1>档案暂时无法展开</h1>
      <p>请重试当前页面；错误状态不会展示敏感细节。</p>
      <Button type="button" onClick={reset}>
        重新尝试
      </Button>
    </Container>
  );
}
