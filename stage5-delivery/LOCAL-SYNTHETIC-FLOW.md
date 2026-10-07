# Stage5 本地合成集成

本批只实现本地合成候选到发现页面的闭环，不代表真实YUC来源已经适配或准入。禁止远端、Preview、Production、自动同步和YUC请求。

## 环境与启动

使用 Node24.x、pnpm10.34.5、PostgreSQL17.10。使用本批专用本机数据库 `menghuan_stage5_test_<session>`，不要复用 Stage3/Stage4 库。数据库管理者在本机创建明确名称的空库；连接地址及凭据仅置于当前 shell 环境，不提交 `.env` 或输出连接串。

显式设置 `APP_ENV=local`、`MENGHUAN_SYNTHETIC_MODE=database` 和 `MENGHUAN_SYNTHETIC_DATABASE_URL=<本机专用测试库连接地址>`。标准模式默认 off；mock 是明确的无数据库预览模式，不是数据库失败时的回退。非 local 环境、非本机主机、非本批库名会拒绝。

在源码根目录执行：

```text
pnpm install --frozen-lockfile
pnpm --filter @menghuan/domain build
pnpm --filter @menghuan/config build
pnpm --filter @menghuan/database build
pnpm --filter @menghuan/database synthetic prepare
pnpm --filter @menghuan/database synthetic enable
pnpm --filter @menghuan/database synthetic import
pnpm --filter @menghuan/database synthetic adopt
pnpm dev:web
```

CLI每次核查实际库名及服务版本。prepare 迁移并准备原10部Stage4合成基线，新来源默认关闭；enable后方可import/adopt。import仅写候选，未采用前不进入页面。adopt使用源码内固定合成映射，不需要后台审批系统，也不采集真实页面。

今日与周放送页面读取已采用快照，首页、季度等共享Repository得到相同隔离结果。所有采用记录标注合成／非官方，来源详情显示原始表达、采用依据和保留示例域名。来源原始值、解析版本和合成创建时间在候选payload保留，不伪称真实抓取。

## 停用、撤回与恢复

```text
pnpm --filter @menghuan/database synthetic disable
pnpm --filter @menghuan/database synthetic status
pnpm --filter @menghuan/database synthetic withdraw
pnpm --filter @menghuan/database synthetic enable
pnpm --filter @menghuan/database synthetic restore
```

disable停止新导入／采用但保留已采用快照。withdraw显式撤回固定样例，不删除候选或原映射快照，Stage4基线仍可读取。restore重新采用固定样例；存在修订冲突时不得静默覆盖。库层采用API支持显式expectedActiveId，只有人工确认旧版本后才替换，事务失败回滚。

将 `MENGHUAN_SYNTHETIC_MODE=off` 后重启本地服务，恢复原Repository行为。不会清空持久化数据。切换运行配置需要重启，不把改变环境变量当作前端开关。

## 迁移与清理

### r2 slug唯一性修复与旧本批库升级

尚未验收的addon迁移新增活动作品slug唯一索引，沿用ID碰撞时的23505事务拒绝语义。不同实体/ID不可共用活动slug；失败不会改变原采用记录，显式撤回后可复用。历史inactive快照允许相同slug，恢复时先恢复/撤回历史快照，最后恢复active快照。

对于仍保留的旧本批本机库，先保留listCandidates及mappingSnapshots，再用新源码执行synthetic prepare（或migrateSyntheticYucDatabase），同一事务幂等补索引，无需删库。若已存在活动slug重复，CREATE UNIQUE INDEX报23505，升级事务回滚，所有候选及映射不变；应人工确认正确作品，通过withdraw显式撤回冲突记录，再重试。不要自动挑第一条、删历史记录或用清空库代替升级。真实PG回归验证无冲突升级、重复升级和已有重复数据时的失败保全。

新增addon位于 `packages/database/stage5-migrations`，不改写历史Drizzle SQL或meta。migrateSyntheticYucDatabase事务执行新建两表及约束；rollbackSyntheticYucDatabase只移除本批addon，原Stage4表不受影响。下迁移会丢失候选及映射数据，应先通过listCandidates及mappingSnapshots保存合成快照，升级后导入并恢复active映射；实际集成测试证明此路径。不能拿删除整库替代业务回滚。

批次结束停止由本批启动的Web／测试进程；核对实际本机库名后，仅删除本批创建的那个库并停止本批集群。不要按名称前缀批量删除、不操作旧集群数据。源码包不包含数据库目录、进程配置、凭据或本地测试数据文件。

## 测试

完整格式／lint／类型／单元／构建门禁通过后，设置TEST_DATABASE_URL为本批空库，运行原 `pnpm test:database`。数据库测试串行，实际覆盖幂等、修订、事务故障、唯一约束、停用、撤回和addon快照恢复。

运行 `pnpm test:e2e` 验证off默认基线；再明确设置上述database模式，运行 `pnpm test:e2e tests/e2e/stage5.spec.ts`。测试自行准备合成样例、采用与撤回，并验证数据库错误不回退Mock。设置 `MENGHUAN_SCREENSHOT_DIR=<包外证据目录>` 保存实际截图。测试拦截非本机页面请求，不访问示例链接或YUC。现有浏览器路径可用PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH显式指定，不升级浏览器或框架。

真实DOM、真实字段和身份依据、来源许可／展示范围、真实受控接入仍未验收；Stage5未关闭，Stage5D未开始。
