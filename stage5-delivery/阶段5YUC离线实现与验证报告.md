# Stage5 YUC 离线 r3 返工报告

日期：2026-10-01。
状态：Stage5 离线实现 r3 提交待审查；真实来源适配未验证；Stage5 未关闭；Stage5D 未开始。

## 输入

Stage4 commit：b12de8206bd3b7586e25f14e6b77d699b774d0a5。
Stage4 Tree：e76f694f281317f7c53cd443a2c36612d41ed23d（125 files）。
r2 ZIP SHA-256：A50D1AA1BD198D996A2C300097918CDE769A78EA365E6CABF4EFE23D5855A59A。
r2 Tree：371f22748001d286ba36dd930c52841123ceef96（136 files）。
r2 原包及报告保留。当前报告取代 r2 开发方结论，不宣称 r2 已验收。

## 逐项修复

1. Standards 存储校验：stage 接受 unknown，首先调用 strict SourceRecord Schema，成功后存入 Zod 解析副本；禁止根层和嵌套扩展字段、错误 URL/状态。实体键、版本与 payloadDigest 必须一致，provenance 源页面和捕获时间必须一致。校验失败不改变库存。
2. Standards 引用隔离：Zod 建立输入深层快照；listCandidates 返回 structuredClone；verified 输入/输出及晋升 fields 同样深复制。测试修改标题、parsedTime 和 provenance，证明输入及查询结果都不能修改库存。
3. Spec 排队熔断：同源队列锁覆盖完整 run 及失败计数更新；下一调用在队首检查开关和熔断。阈值 1 的 run/sync/run 仅调用 fetcher 一次，返回 http-error/1、circuit-open/0、circuit-open/0。保留跨实例串行和间隔测试。
4. Spec 实体修订：合成 HTML 必须提供 data-entity-id；sourceEntityId 是来源身份元数据。实体键只由固定来源 origin 和 ID 构成；日期、季度、年份、标题和暂定状态都属于可变内容版本。缺可靠 ID 报 invalid-response，保持待审，不猜新实体。晋升对 releaseDate、broadcast（包含 timeStatus）、season 全字段比较，冲突不覆盖 verified。旧式手工 verified 缺少 fields 时保守报告冲突。
5. Spec 合法空集合：只有完整闭合、仅含空白的 main data-yuc-list="true" 可以是空成功。合成条目要求 article 的布尔 data-yuc-entry、明确 ID 和标题；赋值式错误标记、异类元素、缺标题、截断和不匹配结构均失败。该规则是合成 Fixture 方言，尚未验证真实 YUC DOM。

## 时间与来源边界

r1/r2 URL、日期时区、25:15 跨日、版本去重、403/429、退避、超时及熔断回归保留。normalizedStartAt 保持 null，不修改 Stage4 时间逻辑。
图片、正文、简介、播放/下载和第三方 URL 无候选字段入口。只使用合成 Fixture 和注入模拟响应。
来源评估三处修订继续有效：只批准离线开发；仅保留 YUC 来源页面 URL；项目准入待办不冒充站点要求。

## 正式验证与交付

Node 24.16.0；独立安装 pnpm 10.34.5，不改用户全局 pnpm。工作目录首次 frozen install 成功，210 个依赖从独立 Store 下载完成。
正式候选在新解包目录从 frozen install 开始，随后依次 format:check、lint、typecheck、全部 Vitest、build；命令、stdout/stderr、退出码和实物身份见包外 r3 验证证据及最终交付报告。旧 pnpm 11 直接工具检查保留为历史辅助证据，不替代 r3 安装门禁。
包内 evidence/TEST-RESULT.txt 指向本次正式日志；完整 ZIP 身份在包外报告记录，避免自引用。
不新增依赖，不修改锁文件/工作区配置、UI、数据库能力或治理文档。没有 Git 提交或远端操作。

## 未完成事项

真实来源许可、可靠真实实体 ID、真实 DOM 解析、持久化与受控页面接入仍未完成。未执行数据库测试和写入。真实采集、公共展示、Stage5D、GitHub/Vercel/Production 未开始。
