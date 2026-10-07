"use client";

import { Button, Container } from "@menghuan/ui";

export default function DiscoveryError() {
  return (
    <Container className="page-shell state-page">
      <section role="alert">
        <h1>资料加载失败</h1>
        <p>现有资料未被清空。请稍后重新加载；若问题持续，请检查当前数据服务。</p>
        <Button className="synthetic-retry" onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </section>
    </Container>
  );
}
