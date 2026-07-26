import { getEnvironment } from "@menghuan/config";
import { createWebHealthResponse } from "@/lib/health";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  const environment = getEnvironment();
  const health = createWebHealthResponse(environment.APP_ENV);

  return (
    <main>
      <h1>梦幻 Web 健康状态</h1>
      <section aria-label="健康信息">
        <dl>
          <dt>Web服务状态</dt>
          <dd>{health.status}</dd>
          <dt>服务名称</dt>
          <dd>{health.service}</dd>
          <dt>应用环境</dt>
          <dd>{health.environment}</dd>
          <dt>构建阶段</dt>
          <dd>Stage {health.stage}</dd>
          <dt>当前时间</dt>
          <dd>{health.timestamp}</dd>
          <dt>版本信息</dt>
          <dd>{health.version}</dd>
        </dl>
      </section>
    </main>
  );
}
