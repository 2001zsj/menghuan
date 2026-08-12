# Menghuan Stage 3 Data Foundation

## 1. 范围

Stage 3只建立阶段2既有页面所需的最小领域与数据访问边界。页面仍展示10部完全虚构作品，不接入YUC、AGE、真实外链、正式搜索、账户或Redis。

## 2. 包边界

- `@menghuan/domain`：领域枚举、Zod Schema、序列化模型、Repository接口、共享Fixture和内存Repository。
- `@menghuan/database`：PostgreSQL Drizzle Schema、Postgres.js连接、迁移、幂等种子和Database Repository。
- `@menghuan/config`：普通运行环境与服务端Repository模式的条件校验。
- `apps/web/src/server/anime-repository.ts`：Web服务器端组合根，默认选择Mock实现，仅在明确的database模式中动态加载数据库实现。

客户端组件只接收经过`AnimePageData` Schema验证、日期时间已转为ISO字符串或`null`的纯数据。客户端代码不得导入`@menghuan/database`。

## 3. 最小领域

领域包含：

- Anime；
- Season；
- AnimeSeason；
- BroadcastInfo；
- Episode；
- 最小STAFF credit；
- 最小CAST credit；
- 已批准资源分类占位。

现有`mock-*`动漫ID保持不变，避免破坏浏览器本地收藏。季度使用`winter | spring | summer | autumn | other`规范值，并通过显式映射显示“春、夏、秋、冬”。未知时间和未知时区始终保留为`null`。

## 4. PostgreSQL Schema

Stage 3只创建：

- `anime`
- `seasons`
- `anime_seasons`
- `broadcast_info`
- `episodes`
- `anime_staff_credits`
- `anime_cast_credits`
- `anime_resource_categories`

没有用户、账户、Session、收藏、进度、最近浏览、来源适配器或全文搜索表。没有`pg_trgm`索引，正式搜索推迟到阶段6。

## 5. Repository模式

服务端变量：

- `MENGHUAN_DATA_REPOSITORY=mock | database`，默认`mock`；
- `DATABASE_URL`仅在database模式下必需；
- `TEST_DATABASE_URL`仅用于独立数据库集成测试命令。

普通安装、单元测试和Build在默认mock模式下不需要数据库。应用启动不会自动迁移或种子。

## 6. 迁移与种子

- `db:generate`：通过Drizzle Kit审查Schema变化；
- `db:migrate`：显式应用迁移；
- `db:seed`：显式写入Stage 3虚构Fixture；
- `test:database`：在隔离Schema中迁移、种子、约束测试、事务回滚、down SQL和清理。

不存在会自动删除普通数据库的根脚本。显式down SQL只由隔离数据库测试辅助调用。

## 7. 推迟内容

以下内容不属于Stage 3：完整人员资料库、角色实体、ResourceLink URL、SourceRecord、FieldProvenance、来源合并、YUC、AGE、同步任务、FTS、`pg_trgm`查询、账户及服务端用户数据。
