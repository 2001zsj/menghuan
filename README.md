# 梦幻（Menghuan）

梦幻是一个完全独立、从零开发的动漫资料、放送信息与外部资源聚合项目。禁止使用任何旧动漫项目、Dimension Lab、次元生成局或其他项目的代码、组件、样式、模型、解析器和Git历史。

## 当前阶段

当前源码为**Stage 3：最小领域模型、PostgreSQL Schema、Drizzle与Mock Repository统一边界**。

界面继续使用同一组10部完全虚构作品。默认`mock`模式无需数据库；`database`模式用于验证同一业务数据通过PostgreSQL Repository返回，不能被理解为真实动漫来源。

## 环境要求

- Node.js 24 LTS
- pnpm 10.34.5

```powershell
corepack pnpm@10.34.5 install --frozen-lockfile
```

## 开发

```powershell
pnpm dev
```

默认Web地址为`http://localhost:3000`。主要路由仍为：

- `/`
- `/today`
- `/schedule`
- `/season`
- `/library`
- `/anime/[slug]`
- `/favorites`
- `/health`
- `/api/health`

## Repository模式

默认使用内存Fixture Repository：

```text
MENGHUAN_DATA_REPOSITORY=mock
```

仅在服务器端数据库模式中配置：

```text
MENGHUAN_DATA_REPOSITORY=database
DATABASE_URL=postgresql://...
```

数据库模式缺少合法`DATABASE_URL`会产生明确的Zod配置错误。变量不会通过`NEXT_PUBLIC_`暴露给浏览器，应用不会在启动或Build时自动迁移、种子。

## 数据库命令

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm test:database
```

`test:database`只读取`TEST_DATABASE_URL`，使用隔离Schema并在结束后清理。不得指向Production或Preview数据库。

## 质量检查

```powershell
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm health:worker
pnpm test:e2e
pnpm test:database
```

## 工作区

- `apps/web`：Next.js App Router页面、服务器Repository组合根、本地偏好和收藏。
- `apps/sync-worker`：健康Worker，仍未接入任何来源。
- `packages/config`：Zod环境变量和Repository模式校验。
- `packages/domain`：最小领域模型、共享Fixture与Repository契约。
- `packages/database`：Drizzle PostgreSQL Schema、迁移、种子和Database Repository。
- `packages/ui`：阶段2设计令牌与基础组件。
- `tests/e2e`：健康与既有用户流程回归测试。
- `docs/architecture`：工程、设计系统和数据边界说明。

## 本地用户数据

- UI偏好：`menghuan:ui-preferences:v1`
- 收藏：`menghuan:favorites:v1`

这些数据只保存在当前浏览器。没有账户、登录、Session、多设备同步或服务端用户数据表。

## 当前明确未实现

没有真实动漫资料、YUC、AGE、外部抓取、正式全文搜索、`pg_trgm`查询、Redis、账户、服务端收藏、最近浏览、观看进度、播放器、下载入口、Docker、CI或部署配置。

GitHub提交、推送和部署由Codex在项目总指挥验收后执行；开发ChatGPT不得操作远程GitHub或部署。
