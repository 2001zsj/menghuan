# YUC 合成离线契约 v3

这份契约只用于本项目自行编写的 Fixture，不能作为真实 YUC 页面结构的事实说明。

非空条目采用闭合 article，布尔 data-yuc-entry，带 data-entity-id 和 data-title。来源实体 ID 必须是 1–100 个字母、数字、下划线或连字符；它在修订中保持稳定，并在同一 YUC 来源 origin 内唯一。
data-date、data-time、data-timezone、data-year、data-quarter 和 data-tentative 是允许解析的可变字段。可选值缺失或无效保留原始值，不猜时区或日期。
缺可靠实体 ID 的内容报 invalid-response，不自动成为新作品；原候选不受影响。
合法空响应仅为闭合 main data-yuc-list="true"，内部只有空白。存在异常条目或结构截断时不判为空。
内容版本由实体键与允许字段的 JSON 表达计算，不含 fetchedAt，所以相同内容再次捕获是幂等；日期/季度/标题/状态变化保留为新版本，并进入冲突处理。
旧 r2 内存快照不自动迁移。r3 没有持久数据库。
Schema 拒绝额外字段并检查版本/digest 与字段一致。输入/输出都是独立深层快照。
请求调度锁覆盖完整运行；同 origin 跨实例并发为 1。熔断器属于 adapter 实例，失败结果提交后才释放队列；同实例后续排队调用重新检查开关和熔断。
fetcher 是注入的模拟接口，本项目不提供真实网络或定时同步入口。超时发出 AbortSignal，模拟或将来的调用方必须遵守取消协议。
