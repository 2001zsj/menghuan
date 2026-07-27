import { getEnvironment } from "@menghuan/config";
import { Card, Container } from "@menghuan/ui";
import { createWebHealthResponse } from "@/lib/health";
export const dynamic = "force-dynamic";
export default function HealthPage() {
  const environment = getEnvironment();
  const health = createWebHealthResponse(environment.APP_ENV);
  return (
    <Container className="page-shell">
      <header className="page-header">
        <h1>梦幻 Web 健康状态</h1>
        <p>Stage 1健康能力在Stage 2中继续保留。</p>
      </header>
      <Card className="definition-list" aria-label="健康信息">
        <dl>
          <dt>Web服务状态</dt>
          <dd>{health.status}</dd>
        </dl>
        <dl>
          <dt>服务名称</dt>
          <dd>{health.service}</dd>
        </dl>
        <dl>
          <dt>应用环境</dt>
          <dd>{health.environment}</dd>
        </dl>
        <dl>
          <dt>构建阶段</dt>
          <dd>Stage {health.stage}</dd>
        </dl>
        <dl>
          <dt>当前时间</dt>
          <dd>{health.timestamp}</dd>
        </dl>
        <dl>
          <dt>版本信息</dt>
          <dd>{health.version}</dd>
        </dl>
      </Card>
    </Container>
  );
}
