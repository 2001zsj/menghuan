# 梦幻（Menghuan）首版核心数据模型建议

## 1. 文件定位

本文件描述“梦幻”首版的领域概念、来源追踪和最小数据库方向。

本文件不是要求在阶段3一次性实现全部未来模型。阶段3只实现支撑当时已验收页面所需的**最小模型**，其余字段与实体需在对应阶段按实际需求补充。

## 2. 设计目标

首版数据模型需要：

- 支持动漫资料、放送信息、季度、剧集、STAFF、CAST 与受控外部资源；
- 支持 YUC、AGE、官方站点及其他来源未来独立接入；
- 支持字段级来源追踪、冲突记录、未知值与有依据的人工修正；
- 支持 PostgreSQL Full Text Search 与 `pg_trgm`；
- 支持北京时间默认展示与日本时间切换；
- 把收藏、最近浏览、观看进度保留为领域概念，但首版只存于浏览器本地；
- 不依赖旧项目模型或外部来源 ID 作为内部主键；
- 不默认引入账户、`user_id` 或服务端用户数据表。

## 3. 通用约定

### 3.1 主键

服务端核心实体使用项目内部生成的稳定 ID，建议 UUIDv7 或等价有序唯一标识。

外部来源 ID 只保存在 SourceRecord 中，不得直接作为 Anime、Episode 等核心实体主键。

浏览器本地数据可使用 Anime 内部 ID 作为引用，但必须处理对应作品被隐藏、合并或删除的情况。

### 3.2 时间字段

来源时间、业务时间、页面展示时间必须分开：

- `published_at`：来源公开时间；
- `fetched_at`：本站获取时间；
- `effective_at`：业务事实生效时间；
- `created_at` / `updated_at`：本站记录时间；
- `source_timezone`：来源明确给出的时区；
- `source_date_text`：来源原始日期表达；
- `source_time_text`：来源原始时间表达；
- `normalized_at`：按来源时区规范化后的绝对时间，如可确定；
- `display_timezone`：页面计算时使用的展示时区，不持久覆盖来源值。

首版默认展示 `Asia/Shanghai`，允许切换 `Asia/Tokyo`。页面换算值属于派生数据，不得写回覆盖原始时间表达。

### 3.3 未知值

未知值使用 `NULL` 或显式状态字段，禁止使用空字符串、`0`、`1970-01-01`、`TBD` 等伪值冒充真实数据。

需要区分原因时，保存：

- `value`；
- `value_status`：`known`、`unknown`、`not_applicable`、`conflicted`、`estimated`；
- `note`；
- `source_record_id`。

`estimated` 只用于来源明确表示“预计”“暂定”的情况，不得由系统自行猜测。

### 3.4 多语言文本

名称和简介不应硬编码为单一语言。可使用子表或结构化字段：

```text
LocalizedText
- id
- entity_type
- entity_id
- field_name
- language_code
- script_code
- value
- is_primary
- source_record_id
```

首版可保留高频展示列，例如 `title_primary`，但其他名称和语言值仍需可追溯。

### 3.5 数据状态

服务端资料实体可使用：

- `draft`；
- `verified`；
- `conflicted`；
- `deprecated`；
- `hidden`。

不得把 `draft`、`conflicted` 或 `hidden` 数据无条件展示在公开页面。

## 4. Anime

代表一部可独立检索和展示的动画作品条目。

### 4.1 建议字段

```text
Anime
- id
- slug
- title_primary
- title_sort
- synopsis_primary
- media_type
- production_status
- release_status
- episode_count_status
- episode_count
- duration_minutes
- original_language
- country_or_region
- age_rating
- primary_season_id
- parent_anime_id
- franchise_key
- poster_remote_url
- poster_source_url
- poster_domain
- poster_usage_status
- poster_last_verified_at
- data_status
- created_at
- updated_at
- deleted_at
```

### 4.2 字段说明

- `media_type`：TV、Web、Movie、OVA、ONA、Special、Music、Other；
- `production_status`：announced、in_production、completed、cancelled、unknown；
- `release_status`：upcoming、airing、finished、delayed、suspended、unknown；
- `episode_count_status` 区分已知、未知、冲突和不适用；
- `parent_anime_id` 只表示直接从属关系，不代替复杂系列关系；
- `franchise_key` 仅作发现分组，不表示严格时间线；
- 官方站点不直接混入图片字段，应通过 ResourceLink 管理；
- `poster_usage_status` 至少区分 `allowed_remote`、`unknown`、`blocked`、`placeholder`；
- 无允许展示的海报时，页面使用本项目占位图，不把占位图伪装为来源海报。

### 4.3 关联

- Anime 1:N BroadcastInfo；
- Anime N:M Season；
- Anime 1:N Episode；
- Anime N:M StaffMember；
- Anime N:M CastMember；
- Anime 1:N ResourceLink；
- Anime 1:N SourceRecord。

Favorite、ViewingProgress 和 RecentView 是首版本地领域概念，不在阶段2或阶段3默认建立服务端关联表。

## 5. BroadcastInfo

代表某部动画在特定地区、平台、频道和来源时区下的一条放送或上线安排。

### 5.1 建议字段

```text
BroadcastInfo
- id
- anime_id
- broadcast_type
- platform_name
- channel_name
- region_code
- language_code
- source_timezone
- source_date_text
- source_time_text
- normalized_start_at
- normalized_end_at
- weekday_in_source_timezone
- recurrence_rule
- episode_offset
- availability_status
- is_primary
- is_simulcast
- is_time_tentative
- note
- source_record_id
- data_status
- created_at
- updated_at
```

### 5.2 业务规则

- `broadcast_type`：television、streaming、theatrical、physical_release、event、unknown；
- 原始日期、时间与时区必须共同保存；
- 日本电视台“25:00”等表达保存于 `source_time_text`，同时可规范化为次日绝对时间；
- 北京时间和日本时间由页面或查询层从规范化值派生；
- 不同平台上线时间不得覆盖电视放送时间；
- “今日更新”必须明确使用的 BroadcastInfo 类型和展示时区；
- `is_time_tentative=true` 时不得表现为确定时间；
- 无法确定来源时区时不得猜测换算结果。

## 6. Season

代表按年份与季度组织的动画发行或放送分组。

### 6.1 建议字段

```text
Season
- id
- year
- quarter
- label
- start_date
- end_date
- reference_timezone
- season_type
- data_status
- created_at
- updated_at
```

### 6.2 规则

- `quarter`：winter、spring、summer、autumn、other；
- `season_type`：broadcast、theatrical、catalog、custom；
- 默认季度划分可使用日本动画行业常用口径，但必须在页面说明；
- 作品可关联多个季度；
- `primary_season_id` 只表示主要发现入口，不抹除跨季度事实。

### 6.3 关联表

```text
AnimeSeason
- anime_id
- season_id
- relation_type
- is_primary
- source_record_id
- created_at
```

## 7. Episode

代表某个 Anime 下的一集、话、特别篇或其他可识别发布单元。

### 7.1 建议字段

```text
Episode
- id
- anime_id
- episode_kind
- sequence_number
- display_number
- title_primary
- synopsis_primary
- duration_minutes
- source_timezone
- source_date_text
- source_time_text
- normalized_release_at
- release_status
- is_recap
- is_finale
- source_record_id
- data_status
- created_at
- updated_at
```

### 7.2 业务规则

- `sequence_number` 用于排序，可使用小数或独立排序键；
- `display_number` 保存“第12话”“SP1”“总集篇”等原始展示文本；
- 不得根据总集数自动生成不存在的 Episode；
- 来源只提供“共 12 集”时，只更新 Anime 集数事实，不生成 12 条空记录；
- 多来源剧集标题冲突时保留来源记录；
- 未播出的未来剧集不得被标记为已发布；
- AGE 可提供剧集信息候选，但必须经字段校验和合并规则处理。

## 8. StaffMember

代表参与动画制作的工作人员或团队主体。

### 8.1 建议字段

```text
StaffMember
- id
- canonical_name
- name_sort
- person_type
- primary_language
- biography
- official_site_url
- data_status
- created_at
- updated_at
```

### 8.2 别名与作品关系

```text
PersonAlias
- id
- person_type
- person_id
- name
- language_code
- alias_type
- source_record_id

AnimeStaffCredit
- id
- anime_id
- staff_member_id
- role_code
- role_label
- department
- credit_order
- note
- source_record_id
- data_status
```

同一人员可在同一作品中拥有多个职务，不得强行合并为单一字符串。

## 9. CastMember

代表配音、演出或参与声音表演的人员。

### 9.1 建议字段

```text
CastMember
- id
- canonical_name
- name_sort
- primary_language
- biography
- official_site_url
- data_status
- created_at
- updated_at
```

### 9.2 角色与配音关系

```text
Character
- id
- canonical_name
- name_sort
- description
- data_status
- created_at
- updated_at

AnimeCastCredit
- id
- anime_id
- cast_member_id
- character_id
- language_code
- credit_type
- credit_order
- note
- source_record_id
- data_status
```

即使首版不建设角色详情页，也可在需要时保留 Character 作为最小关系实体；阶段3不得为未来可能性一次性实现复杂角色系统。

## 10. ResourceLink

代表与某部作品相关、经过分类和核验的外部网页入口。

### 10.1 建议字段

```text
ResourceLink
- id
- anime_id
- resource_type
- title
- url
- normalized_url
- domain
- region_code
- language_code
- identity_status
- authorization_status
- security_status
- availability_status
- requires_login
- is_paid
- is_geo_restricted
- approval_reference
- last_checked_at
- last_http_status
- source_record_id
- data_status
- created_at
- updated_at
```

### 10.2 首版唯一允许的类型

`resource_type` 只允许：

- `official_site`；
- `official_social`；
- `official_video_channel`；
- `broadcaster`；
- `verified_licensed_streaming`；
- `distributor`；
- `encyclopedia`；
- `rating_site`；
- `database`；
- `news`；
- `search`；
- `approved_other`。

不得使用 `licensed_streaming`、`other` 或无限制自由文本代替上述枚举。

### 10.3 身份、授权与安全状态

建议分别保存：

`identity_status`：

- `verified_official`；
- `verified_non_official`；
- `claimed_official`；
- `unknown`。

`authorization_status`：

- `verified_authorized`；
- `not_applicable`；
- `unknown`；
- `prohibited`。

`security_status`：

- `verified_safe`；
- `unknown`；
- `blocked`。

### 10.4 前台展示条件

链接只有同时满足以下条件才可展示：

- 类型属于首版允许枚举；
- 身份达到该类型要求；
- 涉及播放或发行时，授权状态为 `verified_authorized`；
- 安全状态为 `verified_safe`；
- 可用状态允许展示；
- URL 通过协议、域名和重定向检查；
- `approved_other` 存在明确审批依据。

任何无法验证身份、授权状态或安全性的链接默认不展示。

### 10.5 AGE 资源隔离

AGE 可以提供“外部页面线索”，但该线索只能先进入 SourceRecord 或待核验队列。

以下内容不得自动生成 ResourceLink：

- AGE 页面中的播放线路；
- 下载入口；
- 网盘、磁力、种子或文件链接；
- 无法确认实际目标的跳转链接；
- 身份、授权或安全状态未知的资源。

AGE 记录和 ResourceLink 之间不得建立“抓到即发布”的自动通道。

## 11. SourceRecord

SourceRecord 保存外部来源记录与内部实体的映射，是来源追溯核心。

### 11.1 建议字段

```text
SourceRecord
- id
- source_key
- source_entity_type
- source_entity_id
- source_url
- entity_type
- entity_id
- fetched_at
- published_at
- parser_version
- payload_hash
- raw_payload_ref
- normalized_payload
- validation_status
- merge_status
- confidence_level
- is_current
- last_seen_at
- error_code
- error_message
- created_at
- updated_at
```

### 11.2 AGE 候选数据范围

AGE SourceRecord 可包含以下候选字段：

- 动漫目录；
- 分类；
- 年份；
- 更新状态；
- 集数；
- 剧集信息；
- 外部页面线索；
- 其他需要重新核验的公开信息。

播放线路和下载入口即使存在于原始载荷，也必须被标记为禁止前台转换的数据，不得进入公开 ResourceLink 流程。

### 11.3 字段来源追踪

```text
FieldProvenance
- id
- entity_type
- entity_id
- field_path
- source_record_id
- source_value
- normalized_value
- is_selected
- selection_reason
- confidence_level
- first_seen_at
- last_seen_at
```

该结构用于回答当前字段来自哪里、为何采用、是否冲突和何时最后核验。

### 11.4 合并状态

- `unmatched`；
- `matched`；
- `created`；
- `conflicted`；
- `ignored`；
- `blocked`。

## 12. Favorite

Favorite 是首版领域概念，但不是首版服务端数据库表。

### 12.1 浏览器本地结构建议

```text
FavoriteLocalRecord
- schema_version
- anime_id
- created_at
- updated_at
```

### 12.2 规则

- 以 `anime_id` 唯一；
- 只能由用户主动添加或移除；
- 不得根据浏览次数自动收藏；
- 不包含 `user_id`；
- 不调用服务端用户数据 API；
- 浏览器数据清理可能导致记录丢失；
- 读取时必须校验版本和字段。

阶段2与阶段3不得默认创建 Favorite 数据库表。

## 13. ViewingProgress

ViewingProgress 是用户主动设置的本地观看进度概念。

### 13.1 浏览器本地结构建议

```text
ViewingProgressLocalRecord
- schema_version
- anime_id
- episode_id
- episode_number
- progress_type
- status
- note
- set_by_user_at
- updated_at
```

### 13.2 枚举

`status`：

- planned；
- watching；
- paused；
- completed；
- dropped；
- unset。

`progress_type`：

- episode_reference；
- episode_number；
- completion_only。

### 13.3 规则

- 进度只能由用户主动设置；
- 不得因点击外部资源、停留时间、详情访问或剧集资料访问自动增加；
- 当 Episode 不存在时，可暂存 `episode_number`；
- 后续匹配不得擅自修改用户原值；
- 作品总集数变化时，不自动改变用户状态；
- 不包含 `user_id`；
- 阶段2与阶段3不得默认创建 ViewingProgress 数据库表。

## 14. RecentView

RecentView 是首版浏览器本地概念。

```text
RecentViewLocalRecord
- schema_version
- anime_id
- viewed_at
- source_surface
```

规则：

- 最近浏览不等于观看进度；
- 允许用户清除；
- 使用合理条数或期限限制；
- 不记录外部站点观看行为；
- 不包含 `user_id`；
- 阶段2与阶段3不得默认创建 RecentView 数据库表。

## 15. ThemePreference 与 TimezonePreference

```text
UiPreferenceLocalRecord
- schema_version
- theme                 # system | light | dark
- display_timezone      # Asia/Shanghai | Asia/Tokyo
- updated_at
```

规则：

- 默认时区为 `Asia/Shanghai`；
- 只允许切换到明确允许的时区；
- 主题与时区偏好仅保存在本地；
- 服务端首次渲染不得假设用户已设置偏好；
- 损坏或未知值应回退到安全默认值。

## 16. 字段来源原则

| 字段 | 优先来源 | 说明 |
|---|---|---|
| 官方标题 | 作品官方站、发行方 | 保留其他常用别名 |
| 首播日期 | 电视台、官方公告 | 暂定信息必须标记 |
| 网络上线时间 | 经核验的授权平台 | 不覆盖电视放送时间 |
| STAFF/CAST | 官方站、制作方、可核验片尾资料 | 保留职务原文 |
| 剧集标题 | 官方节目表或经核验页面 | AGE 可作候选，不自动视为最终值 |
| 中文译名 | 正式发行名称或明确来源 | 通用名可作为别名 |
| 海报 | 允许远程展示的来源 | 保存域名、来源与使用状态 |
| 资源性质 | 目标站点身份与授权证据 | 未知默认不展示 |

人工修正必须记录修改字段、前后值、时间、依据和覆盖策略，不得无依据补全未知字段。

## 17. 合并和去重规则

### 17.1 作品

禁止只按标题自动合并。匹配应综合：

- 官方站 URL；
- 来源外部 ID；
- 首播日期；
- 媒体类型；
- 制作公司；
- STAFF/CAST 重合；
- 季度；
- 集数；
- 系列关系。

匹配等级：

- 确定匹配；
- 高概率匹配；
- 不确定匹配；
- 确定不同。

不确定匹配不得自动写入为同一作品。

### 17.2 续作、分割放送与特别篇

- 官方明确作为第二季、续篇、Part 2 或独立作品发布时，建立独立 Anime；
- 同一作品被来源页面拆分时，不自动拆成多个内部条目；
- OVA、特别篇、总集篇是否独立建条目，依据独立发行和检索需求；
- 不使用标题中的数字作为唯一判断条件。

### 17.3 人物

StaffMember 和 CastMember 综合原文姓名、别名、官方页面、所属机构、公开稳定信息和作品履历去重。同名不同人不得合并。

### 17.4 URL

ResourceLink 规范化时：

- 去除纯追踪参数；
- 保留决定内容的路径和查询参数；
- 统一协议与主机大小写；
- 不盲目跟随重定向；
- 不把不同地区或语言页面错误合并。

## 18. 冲突与未知字段

### 18.1 冲突处理

先判断差异是否来自：

- 电视放送与网络上线；
- 时区换算；
- 暂定与最终公告；
- 地区版本；
- 特别篇计数；
- 真正的数据错误。

当前采用值由字段策略决定，同时保留未采用值与原因。来源更新更晚不必然更准确，来源突然置空不得覆盖已有验证值。

### 18.2 未知字段规则

1. 未知保持未知；
2. 不使用默认值伪装真实值；
3. 不把“未提供”解释为“没有”；
4. 不因单一来源缺失删除其他来源已有值；
5. 暂定值使用专用状态；
6. 冲突值使用冲突状态；
7. 不适用字段使用 `not_applicable`；
8. 前台使用准确的未知或冲突文案；
9. 搜索与筛选区分未知和明确否定；
10. 后续补全保留历史来源。

## 19. 数据完整性约束

阶段3按最小模型逐步实现下列适用约束：

- Anime.slug 唯一；
- Season `(year, quarter, season_type)` 唯一；
- ResourceLink `(anime_id, normalized_url)` 在有效记录中唯一；
- SourceRecord 的来源记录标识唯一或带版本唯一；
- AnimeSeason 关系唯一；
- Episode 排序键在 Anime 内受约束并兼容 SP、0、12.5；
- 服务端关系表使用外键；
- 删除核心实体前检查来源、资源和本地引用兼容策略。

不得为 Favorite、ViewingProgress、RecentView 增加 `user_id` 唯一约束，因为首版不建立这些服务端表。

## 20. 图片数据边界

- 只保存允许远程展示的 URL 与来源元数据；
- 图片域名必须在允许名单中；
- 不把远程海报批量抓取到本地或对象存储；
- 无合适图片时使用项目占位图；
- 图片来源失效、权利状态不明或收到下线要求时停止展示；
- 对象存储、长期缓存和图片加工必须另行审批后再设计模型。

## 21. 隐私与本地数据

- 首版没有账户数据库表；
- 首版不处理服务端收藏、进度和最近浏览；
- 本地数据只用于用户明确选择的功能；
- 支持查看、修改、导出和清除；
- 不建立跨站追踪或用户画像；
- 日志不得收集浏览器本地个性化数据；
- 未来账户同步必须重新审批，不能沿用本文件直接实施。

## 22. 首版不建立的数据

- 用户、账户、Session、OAuth 和多设备同步表；
- 评论、评分、关注、私信和社区关系；
- AI 标签、AI 摘要和 AI 推荐；
- 视频播放地址、下载地址、字幕文件；
- AGE 播放线路和下载入口的公开资源表；
- 复杂角色关系图；
- 商业订单、付费与订阅；
- 从未知来源推断的热度和评分；
- 未经用户主动设置的观看行为模型。
