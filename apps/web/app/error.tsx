"use client";

export default function ErrorPage({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main>
      <h1>服务暂时发生错误</h1>
      <p>请重试健康检查。</p>
      <button type="button" onClick={reset}>
        重试
      </button>
    </main>
  );
}
