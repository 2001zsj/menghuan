# 梦幻（Menghuan）

梦幻是一个完全独立、从零建设的新项目，不继承任何旧动漫网站、旧组件、旧数据模型、旧解析器、旧设计系统、旧部署配置或Git历史。

## 当前阶段

当前仅完成 **Stage 1——全新工程初始化与质量基线**。根页面和健康页面不是正式动漫网站页面。

## 运行要求

- Node.js 24 LTS（仓库通过 `.nvmrc` 和 `engines.node` 锁定Node 24主版本）
- pnpm 10.34.5（以根 `package.json` 的 `packageManager` 为准）

## 安装

```text
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
```

首次从没有锁文件的开发草稿生成依赖锁时使用 `pnpm install`；正式基线应优先使用冻结锁文件安装。

## 开发与构建

```text
pnpm dev
pnpm dev:web
pnpm build
```

Web默认运行于 `http://localhost:3000`。

## 健康检查

- 根状态页：`/`
- Web健康页：`/health`
- Web健康接口：`/api/health`
- Worker一次性健康命令：`pnpm health:worker`

Worker健康命令只输出结构化JSON并退出，不会连接数据库、请求外部网站或启动后台常驻进程。

## 质量命令

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm health:worker
pnpm test:e2e
```

Playwright通常会管理自己的Chromium。受控环境也可以通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指向已安装的Chromium可执行文件。

## 环境变量

根目录 `.env.example` 是统一模板。Web本地开发可复制为 `apps/web/.env.local`，Worker可通过PowerShell或进程环境变量设置同名配置。阶段1仅允许：

- `APP_ENV=local | preview | production`
- `NEXT_PUBLIC_SITE_URL=<合法URL>`
- `LOG_LEVEL=trace | debug | info | warn | error | fatal`

阶段1不存在数据库、Redis、认证、Session、YUC、AGE或部署令牌配置。

## 工作区结构

- `apps/web`：Next.js App Router健康Web，包名 `@menghuan/web`
- `apps/sync-worker`：一次性Node.js Worker健康骨架，包名 `@menghuan/sync-worker`
- `packages/config`：Web与Worker共享的Zod环境校验，包名 `@menghuan/config`
- `tests/e2e`：Playwright健康冒烟测试
- `docs/architecture`：工程基线说明

## 当前明确未实现

阶段1没有动漫业务页面、导航、设计系统、动漫图片、搜索、收藏、观看进度、账户、数据库、同步调度器、抓取器、YUC或AGE接入、Docker、CI工作流和部署配置。

## 协作边界

开发ChatGPT只生成和检查代码包，不操作远程GitHub、不创建提交、不部署。GitHub同步、提交、标签和预览或生产部署由Codex在项目总指挥验收后执行。
