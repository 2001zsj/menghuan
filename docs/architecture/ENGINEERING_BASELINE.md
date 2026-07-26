# Menghuan Stage 1 Engineering Baseline

## 1. 阶段说明

本文件记录梦幻项目Stage 1的实际工程质量基线。该阶段只提供可安装、检查、测试、构建和启动的工程骨架，不包含正式动漫业务能力。

## 2. 技术与依赖版本

| 工具或依赖        | 固定版本或范围                 |
| ----------------- | ------------------------------ |
| Node.js           | `>=24.0.0 <25`，`.nvmrc`为`24` |
| pnpm              | `10.34.5`                      |
| Next.js           | `16.2.11`                      |
| React / React DOM | `19.2.8`                       |
| TypeScript        | `6.0.3`                        |
| Zod               | `4.4.3`                        |
| Vitest            | `4.1.10`                       |
| Playwright Test   | `1.61.1`                       |
| ESLint            | `9.39.5`                       |
| Prettier          | `3.9.6`                        |
| tsx               | `4.23.1`                       |

完整解析后的依赖版本以 `pnpm-lock.yaml` 为唯一安装依据。

## 3. 工作区结构

- `@menghuan/web`：Next.js App Router健康Web。
- `@menghuan/sync-worker`：一次性Worker健康命令，不是后台服务。
- `@menghuan/config`：共享Zod环境变量定义。

未引入Turborepo、Nx或其他任务编排工具。根脚本通过pnpm workspace过滤器串联各包。

## 4. 根目录脚本

- `dev`、`dev:web`：启动Web开发服务器。
- `build`：依次构建配置包、Worker和Web。
- `lint`：执行全仓ESLint。
- `typecheck`：依次检查三个工作区。
- `test`：运行Vitest单元测试。
- `test:e2e`：启动Web并运行Playwright健康冒烟测试。
- `format`、`format:check`：执行Prettier写入或只读检查。
- `health:worker`：运行Worker一次性健康命令。

所有脚本使用跨平台Node/pnpm工具，不依赖`rm -rf`、`cp`、`export`等平台专用Shell语法。

## 5. 环境变量

阶段1仅定义：

- `APP_ENV`：`local | preview | production`，默认`local`。
- `NEXT_PUBLIC_SITE_URL`：合法URL，默认`http://localhost:3000`。
- `LOG_LEVEL`：`trace | debug | info | warn | error | fatal`，默认`info`。

Web和Worker复用`@menghuan/config`。解析失败时抛出包含字段路径的明确错误。阶段1没有数据库、Redis、认证、Session、外部来源或部署密钥。

## 6. 测试策略

Vitest覆盖：

1. 合法环境配置；
2. 安全本地默认值；
3. 非法`APP_ENV`；
4. 非法URL；
5. Web健康响应纯函数；
6. Worker健康响应纯函数；
7. Worker健康命令在配置合法时返回0、配置错误时返回非0。

Playwright覆盖：

1. 启动Web；
2. 打开`/health`；
3. 验证梦幻或Web服务名称；
4. 请求`/api/health`；
5. 验证HTTP 200、`status=ok`和`service=menghuan-web`。

所有单元测试均不访问网络。

## 7. Stage 1边界

未创建正式首页、正式导航、设计系统、动漫卡片、动漫图片、Mock动漫数据、搜索、收藏、观看进度、账户、数据库、Redis、同步调度器、抓取器、YUC或AGE代码、Docker、CI和部署配置。

## 8. Stage 2前置条件

进入Stage 2前必须：

1. 项目总指挥验收Stage 1完整源码包和阶段报告；
2. Codex比较基线差异并重新运行全部要求检查；
3. Codex完成Stage 1D的首次GitHub同步与健康页预览部署；
4. 项目总指挥明确下达Stage 2任务。

## 9. Windows兼容注意事项

- 使用Corepack启用固定pnpm版本。
- 所有根脚本从PowerShell直接运行，不依赖POSIX Shell。
- 环境变量通过`.env.local`或PowerShell标准方式配置，不在脚本中使用`export`。
- Playwright浏览器按其官方安装流程准备；也可通过`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`指向已有Chromium。
- 文件换行由`.editorconfig`和Prettier统一为LF，Git交接时不得修改五份基线文档正文。
