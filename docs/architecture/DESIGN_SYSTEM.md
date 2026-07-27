# 梦幻 Stage 2设计系统

## 1. 视觉方向

阶段2采用全新“梦境档案馆”方向：清晰、安静、轻盈，以资料发现而非视频播放为核心。视觉只使用系统字体、抽象占位海报和有限的紫罗兰、靛蓝、青色强调，不复制任何旧项目或现有动漫网站。

## 2. 语义令牌

令牌位于`packages/ui/src/styles.css`，包括：

- 背景、表面、正文、弱化文字、边框和状态色；
- 系统字体与五级字号；
- 紧凑和普通行高；
- 八级间距；
- 四级圆角；
- 边框、阴影和层级；
- 76rem最大容器宽度；
- 平板和桌面参考断点；
- 快速与普通动效时长；
- 统一焦点环；
- 浅色、深色和跟随系统三种主题表现。

## 3. 组件

`@menghuan/ui`提供Button、IconButton、Badge、Card、Container、SectionHeader、Tabs、SegmentedControl、Select、EmptyState、Skeleton、PosterPlaceholder、Drawer、AnimeCard、BroadcastItem和FavoriteButton。

组件不依赖Tailwind或第三方UI库。图标由项目内简洁SVG构成，纯图标按钮必须提供可访问名称。

## 4. 响应式策略

- 360px：单列卡片、紧凑顶部栏、抽屉导航；
- 768px：单列到双列的过渡布局；
- 1280px：桌面导航、双列卡片、宽内容区；
- 更宽屏幕：内容限制在76rem容器内。

放送表不使用宽表格，在移动端保持纵向条目，避免横向滚动。

## 5. 主题与偏好

主题值仅允许`system`、`light`、`dark`；时区仅允许`Asia/Shanghai`、`Asia/Tokyo`。偏好保存在`menghuan:ui-preferences:v1`，读取时使用Zod验证，损坏值回退到系统主题和北京时间。

根布局包含极小的主题启动脚本，用于在React水合前应用已保存的合法主题值，减少闪烁。正式偏好读取和持久化仍由Zod校验模块负责。

## 6. 可访问性

- 语义化header、nav、main、section、article；
- 跳转主要内容链接；
- 每页一个主要h1；
- 清晰焦点环；
- 按钮和表单均有名称或label；
- 状态同时使用文字，不只依赖颜色；
- Drawer提供dialog、aria-modal、aria-expanded和Escape关闭；打开时焦点进入抽屉并在内部循环，关闭时恢复原触发按钮，遮罩不进入正常Tab顺序；标题通过React `useId`生成唯一ID；
- 支持`prefers-reduced-motion`；
- 抽象海报提供替代文本。

## 7. 筛选语义与标题层级

星期切换是内容筛选器，不使用不完整的`tab`/`tabpanel`模式。控件由带隐藏`legend`的`fieldset`和原生按钮组成，当前星期通过`aria-pressed="true"`表达。

季度、资料库和收藏结果均位于由可见`h2`命名的`section`内，卡片标题继续使用`h3`。空状态保留在同一命名区域中。

上述内容是Stage 2R-A的静态实现说明；受当前工具链环境限制，尚未声称通过正式浏览器质量门禁。

## 8. 阶段边界

本设计系统只服务于Stage 2 Mock页面骨架。它不包含真实海报、播放器、播放线路、下载入口、数据库、账户、正式搜索、YUC或AGE接入，也不代表未来数据库模型。
