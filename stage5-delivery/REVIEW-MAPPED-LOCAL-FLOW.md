# 人工映射与逐字段采用：本地合成工作单

本批是**真实观察审核契约的合成数据验证**。所有观察和内部作品自行编写，不是 YUC 原文。真实导入无可执行入口，默认关闭，未批准展示或部署。

## 运行边界

Node 24.x、pnpm 10.34.5、loopback PostgreSQL 17.10；创建本批专用 `menghuan_stage5_test_mapping_<唯一标识>`，不要使用任何已有 Preview/业务库。

显式设置 APP_ENV=local、MENGHUAN_REVIEW_MODE=synthetic-test、MENGHUAN_REVIEW_DATABASE_URL 为上述本地库；旧 MENGHUAN_SYNTHETIC_MODE 必须 off。普通启动不会创建会话、迁移或导入资料。

先运行 `pnpm typecheck` 构建工作区包产物，然后：

```text
pnpm --filter @menghuan/database exec tsx src/cli/review.ts init --synthetic-test
pnpm --filter @menghuan/database exec tsx src/cli/review.ts list --synthetic-test
```

init 是明确的测试初始化，创建/启用合成会话并保存内置 Fixture，不采用字段。命令入口不接受任意 JSON 文件。测试会话不是账户 Session 或来源许可；真实资料必须另行批准用途并实现单独边界，不能改标记绕过。

## 工作单步骤

所有命令末尾均须带 `--synthetic-test`。UUID 可由 uuid 命令生成；观察/作品/摘要/版本来自 list 或 diff，不猜测或自动刷新已审查版本。

1. `diff <观察UUID> <内部作品ID>`：读取两个独立对象，审核同名、续作和日期区别；身份不能由序号/标题推断。
2. `map <决定UUID> <观察UUID> <候选版本> <摘要> <作品ID> <作品版本> <项目映射UUID> <理由> <身份依据> [被替代的已撤回决定UUID]`：建立关联，不采用字段。被替代决定须已撤回且共享项目锚点。
3. `adopt <采用UUID> <映射UUID> <候选版本> <摘要> <作品版本> <逗号分隔字段> <理由> [resolve]`：逐项选择 title/date/time/timezone/year/quarter/status。缺少 resolve 时，冲突保留已验证值，并生成 conflict 决定；明确解决冲突须新 UUID、当前版本及理由。
4. `hold <观察UUID> <理由>` / `reject <观察UUID> <理由>`：保留待审或拒绝理由。拒绝阻止新映射及采用；重新审查须先新 hold 决定。
5. `reschedule-demo`：只新增一条自行编写的改期观察。它不会自动关联；用 map 选择同一内部作品及项目锚点，再以新采用决定处理冲突。
6. `calendar-demo`：保存独立的自行编写的明确季度/时间场景，用于今日与每周流程。仍须人工 map/adopt；不是从 /202610/ 推断季度。
7. `withdraw <映射UUID> <理由>`：撤回该映射下的采用贡献；仅改变仍归该决定拥有的字段，保留其他已批准贡献。错误映射更正通过新决定完成，历史保留。
8. `off`：停止新导入/映射/采用，已采用数据保留；withdraw 仍可单独执行。`on` 是明确的本地演示恢复，不触发网络请求。

## 存储和状态

独立 additive 0002_review_mapped.sql/down.sql；不修改 Drizzle 初始 SQL/meta 或 0001 历史迁移。观察保存带 UUID/snapshot、性质、原始+规范字段、provenance、版本和 SHA-256 摘要；来源身份 null。

观察：保存 → pending/rejected 审查记录 → 显式映射；候选修订递增版本、保存历史，旧摘要拒绝。

映射：approved → revoked；同观察只允许一个 approved。纠错新增决定，不重写旧决定。字段采用：approved / conflict → revoked。重复同一完整决定幂等，复用 UUID 改内容拒绝。

字段贡献保存原值、候选版本、来源页、观察时间、人工身份依据、采用理由与归属。作品原有人工基值独立保留。事务串行化测试会话，数据库唯一约束兜底；采用和贡献/版本更新同事务。撤回从仍有效的贡献链恢复，最后回到人工基值，不恢复已撤回的旧贡献。

没有采用的作品不可见。页面通过既有 Repository 合并独立审核作品，不改变业务库；候选、拒绝字段和冲突新值不入页面。数据库错误抛给现有错误恢复，不回落 Mock 成功。来源关闭不清空已采用资料。

真实使用尚缺独立用途裁决与受控试验；合成测试通过不代表真实 YUC 准入、匹配或展示已验收。Stage5 未关闭，Stage5D 未开始。
