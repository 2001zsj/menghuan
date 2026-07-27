# 梦幻（Menghuan）

梦幻是一个完全独立、从零开发的动漫资料、放送信息与外部资源聚合项目。禁止使用任何旧动漫项目、Dimension Lab、次元生成局或其他项目的代码、组件、样式、模型、解析器和Git历史。

## 当前阶段

当前源码为**Stage 2：全新设计系统、响应式导航和Mock页面骨架**。

阶段2只使用10部完全虚构的Mock作品验证视觉、信息架构、本地偏好和本地收藏。它不接入真实来源，不代表正式数据库模型。

## 环境要求

- Node.js 24 LTS
- pnpm 10.34.5

```powershell
corepack pnpm@10.34.5 install
```

## 开发

```powershell
pnpm dev
```

默认Web地址为`http://localhost:3000`。

主要Mock路由：

- `/`
- `/today`
- `/schedule`
- `/season`
- `/library`
- `/anime/[slug]`
- `/favorites`

健康能力继续保留：

- `/health`
- `/api/health`

## 检查

```powershell
pnpm install
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm health:worker
pnpm test:e2e
```

## 工作区

- `apps/web`：Next.js App Router页面、Mock数据、本地偏好和收藏。
- `apps/sync-worker`：Stage 1一次性健康Worker，未接入任何来源。
- `packages/config`：服务端环境变量校验。
- `packages/ui`：Stage 2全新设计令牌与基础组件。
- `tests/e2e`：健康与Stage 2用户流程冒烟测试。
- `docs/architecture`：工程基线和设计系统说明。

## 本地数据

- UI偏好：`menghuan:ui-preferences:v1`
- 收藏：`menghuan:favorites:v1`

数据只保存在当前浏览器。没有账户、登录、Session、多设备同步或服务端用户数据API。

## 当前明确未实现

没有真实动漫资料、真实海报、YUC、AGE、外部抓取、PostgreSQL、Drizzle、Redis、正式搜索、最近浏览、观看进度、播放器、播放线路、下载入口、Docker、CI或部署配置。

GitHub提交、推送和部署由Codex在项目总指挥验收后执行；开发ChatGPT不得操作远程GitHub或部署。
