import type {
  AnimeMediaType,
  AnimeReleaseStatus,
  BroadcastState,
  ResourceCategory,
  SeasonQuarter,
  Weekday,
} from "../enums.js";
import { animePageDataArraySchema, type AnimePageData } from "../schemas.js";

interface LegacyStage2Fixture {
  id: string;
  slug: string;
  title: string;
  alias: string;
  synopsis: string;
  season: { year: number; quarter: SeasonQuarter };
  releaseStatus: AnimeReleaseStatus;
  mediaType: AnimeMediaType;
  tags: string[];
  broadcast: {
    state: BroadcastState;
    originalExpression: string;
    originalDateText: string | null;
    originalTimeText: string | null;
    sourceTimezone: string | null;
    sourceWeekday: Weekday | null;
    normalizedStartAt: string | null;
    broadcastType: "broadcast" | "streaming";
  };
  staff: Array<{ role: string; name: string }>;
  cast: Array<{ characterName: string; performerName: string }>;
  episodes: Array<{ displayNumber: string; title: string; state: "published" | "upcoming" }>;
  resourceCategories: ResourceCategory[];
}

const legacyStage2Fixture: LegacyStage2Fixture[] = [
  {
    id: "mock-moonlit-archive",
    slug: "moonlit-archive",
    title: "月灯档案馆",
    alias: "Moonlit Archive",
    synopsis: "见习档案员在漂浮于夜海之上的资料馆中，整理会随梦境改变文字的无名卷宗。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "tv",
    tags: ["幻想", "日常", "档案"],
    broadcast: {
      state: "updated",
      originalExpression: "日本时间 周一 23:00",
      originalDateText: "周一",
      originalTimeText: "23:00",
      sourceTimezone: "Asia/Tokyo",
      sourceWeekday: "mon",
      normalizedStartAt: "2026-07-27T14:00:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [
      { role: "监督", name: "雾岛遥（虚构）" },
      { role: "系列构成", name: "白川词（虚构）" },
    ],
    cast: [
      { characterName: "灯里", performerName: "朝雾澄（虚构）" },
      { characterName: "墨", performerName: "森野律（虚构）" },
    ],
    episodes: [
      { displayNumber: "1", title: "没有编号的书架", state: "published" },
      { displayNumber: "2", title: "潮声中的索引", state: "upcoming" },
    ],
    resourceCategories: ["official_site", "encyclopedia", "database"],
  },
  {
    id: "mock-starlight-memo",
    slug: "starlight-memo",
    title: "星灯备忘录",
    alias: "Starlight Memo",
    synopsis: "城市停电后的七分钟里，三名学生收到来自未来的同一条语音备忘录。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "tv",
    tags: ["青春", "科幻", "悬疑"],
    broadcast: {
      state: "upcoming",
      originalExpression: "日本时间 周二 00:30",
      originalDateText: "周二",
      originalTimeText: "00:30",
      sourceTimezone: "Asia/Tokyo",
      sourceWeekday: "tue",
      normalizedStartAt: "2026-07-27T15:30:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "新海丘（虚构）" }],
    cast: [{ characterName: "凪", performerName: "青木真昼（虚构）" }],
    episodes: [
      { displayNumber: "1", title: "七分钟以后", state: "published" },
      { displayNumber: "2", title: "未发送的录音", state: "upcoming" },
    ],
    resourceCategories: ["official_social", "news"],
  },
  {
    id: "mock-cloud-garden",
    slug: "cloud-garden",
    title: "云上庭园",
    alias: "Garden Above Clouds",
    synopsis: "负责维护天空花园的少年，发现每一朵花都记录着地面城市遗忘的一天。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "tv",
    tags: ["奇幻", "冒险", "治愈"],
    broadcast: {
      state: "upcoming",
      originalExpression: "北京时间 周三 20:00",
      originalDateText: "周三",
      originalTimeText: "20:00",
      sourceTimezone: "Asia/Shanghai",
      sourceWeekday: "wed",
      normalizedStartAt: "2026-07-29T12:00:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "林野空（虚构）" }],
    cast: [{ characterName: "遥", performerName: "水原叶（虚构）" }],
    episodes: [{ displayNumber: "1", title: "第一粒种子", state: "published" }],
    resourceCategories: ["broadcaster", "database"],
  },
  {
    id: "mock-blue-hour-post",
    slug: "blue-hour-post",
    title: "蓝时邮局",
    alias: "Blue Hour Post",
    synopsis: "只在日落后营业一小时的邮局，为无法告别的人投递迟到多年的信。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "short",
    tags: ["温情", "都市", "短篇"],
    broadcast: {
      state: "updated",
      originalExpression: "日本时间 周四 22:15",
      originalDateText: "周四",
      originalTimeText: "22:15",
      sourceTimezone: "Asia/Tokyo",
      sourceWeekday: "thu",
      normalizedStartAt: "2026-07-30T13:15:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "月见纱（虚构）" }],
    cast: [{ characterName: "邮差", performerName: "佐原音（虚构）" }],
    episodes: [{ displayNumber: "1", title: "寄往昨天", state: "published" }],
    resourceCategories: ["official_video_channel"],
  },
  {
    id: "mock-silent-orbit",
    slug: "silent-orbit",
    title: "静默轨道",
    alias: "Silent Orbit",
    synopsis: "无人空间站重启后，值守员必须判断不断出现的生活痕迹究竟来自谁。",
    season: { year: 2026, quarter: "autumn" },
    releaseStatus: "upcoming",
    mediaType: "tv",
    tags: ["太空", "悬疑", "心理"],
    broadcast: {
      state: "tbd",
      originalExpression: "放送时间待定",
      originalDateText: null,
      originalTimeText: null,
      sourceTimezone: null,
      sourceWeekday: null,
      normalizedStartAt: null,
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "真壁零（虚构）" }],
    cast: [{ characterName: "遥测员", performerName: "北原一（虚构）" }],
    episodes: [],
    resourceCategories: ["official_site", "news"],
  },
  {
    id: "mock-rain-library",
    slug: "rain-library",
    title: "雨幕图书室",
    alias: "Library in Rain",
    synopsis: "每逢暴雨，学校废弃图书室会出现一本写着来访者未来选择的书。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "tv",
    tags: ["校园", "奇谈", "成长"],
    broadcast: {
      state: "upcoming",
      originalExpression: "北京时间 周五 21:00",
      originalDateText: "周五",
      originalTimeText: "21:00",
      sourceTimezone: "Asia/Shanghai",
      sourceWeekday: "fri",
      normalizedStartAt: "2026-07-31T13:00:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "许雾（虚构）" }],
    cast: [{ characterName: "知夏", performerName: "江铃（虚构）" }],
    episodes: [{ displayNumber: "1", title: "借阅期限", state: "published" }],
    resourceCategories: ["encyclopedia", "rating_site"],
  },
  {
    id: "mock-cyan-compass",
    slug: "cyan-compass",
    title: "青色罗盘",
    alias: "Cyan Compass",
    synopsis: "不会指向北方的罗盘，带领海图修复师寻找从世界地图上消失的小岛。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "tv",
    tags: ["航海", "冒险", "友情"],
    broadcast: {
      state: "upcoming",
      originalExpression: "日本时间 周六 18:30",
      originalDateText: "周六",
      originalTimeText: "18:30",
      sourceTimezone: "Asia/Tokyo",
      sourceWeekday: "sat",
      normalizedStartAt: "2026-08-01T09:30:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "海堂岬（虚构）" }],
    cast: [{ characterName: "澪", performerName: "风见葵（虚构）" }],
    episodes: [{ displayNumber: "1", title: "无北之针", state: "published" }],
    resourceCategories: ["distributor", "database"],
  },
  {
    id: "mock-night-tram",
    slug: "night-tram",
    title: "夜行电车第零站",
    alias: "Night Tram Zero",
    synopsis: "错过末班车的乘客登上一辆没有终点表的电车，并在每站归还一段记忆。",
    season: { year: 2026, quarter: "summer" },
    releaseStatus: "airing",
    mediaType: "tv",
    tags: ["都市", "奇幻", "群像"],
    broadcast: {
      state: "upcoming",
      originalExpression: "日本时间 周日 23:45",
      originalDateText: "周日",
      originalTimeText: "23:45",
      sourceTimezone: "Asia/Tokyo",
      sourceWeekday: "sun",
      normalizedStartAt: "2026-08-02T14:45:00.000Z",
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "久远时（虚构）" }],
    cast: [{ characterName: "乘务员", performerName: "星野渡（虚构）" }],
    episodes: [{ displayNumber: "1", title: "不存在的站牌", state: "published" }],
    resourceCategories: ["broadcaster", "news"],
  },
  {
    id: "mock-glass-tide",
    slug: "glass-tide",
    title: "玻璃潮汐",
    alias: "Glass Tide",
    synopsis: "海水在清晨凝结成透明街道，潮汐观测员沿着裂纹追查异常源头。",
    season: { year: 2026, quarter: "spring" },
    releaseStatus: "finished",
    mediaType: "movie",
    tags: ["海洋", "幻想", "剧情"],
    broadcast: {
      state: "updated",
      originalExpression: "网络公开时间：北京时间 19:00",
      originalDateText: null,
      originalTimeText: "19:00",
      sourceTimezone: "Asia/Shanghai",
      sourceWeekday: "sun",
      normalizedStartAt: "2026-07-26T11:00:00.000Z",
      broadcastType: "streaming",
    },
    staff: [{ role: "监督", name: "潮见澈（虚构）" }],
    cast: [{ characterName: "澄", performerName: "南野璃（虚构）" }],
    episodes: [{ displayNumber: "完整篇", title: "完整篇", state: "published" }],
    resourceCategories: ["verified_licensed_streaming"],
  },
  {
    id: "mock-wind-notes",
    slug: "wind-notes",
    title: "风写的注脚",
    alias: "Footnotes by Wind",
    synopsis: "古籍修复师发现页边注脚会随季风变化，指向一座被删去名字的村庄。",
    season: { year: 2026, quarter: "autumn" },
    releaseStatus: "upcoming",
    mediaType: "tv",
    tags: ["历史幻想", "旅途", "谜题"],
    broadcast: {
      state: "tbd",
      originalExpression: "具体日期与时间待定",
      originalDateText: null,
      originalTimeText: null,
      sourceTimezone: null,
      sourceWeekday: null,
      normalizedStartAt: null,
      broadcastType: "broadcast",
    },
    staff: [{ role: "监督", name: "桥下文（虚构）" }],
    cast: [{ characterName: "砚", performerName: "清水遥（虚构）" }],
    episodes: [],
    resourceCategories: ["approved_other"],
  },
];

const quarterLabel = {
  winter: "冬",
  spring: "春",
  summer: "夏",
  autumn: "秋",
  other: "其他",
} satisfies Record<SeasonQuarter, string>;

function fixtureTimestamp(index: number): string {
  return new Date(Date.UTC(2026, 6, 1, 0, index)).toISOString();
}

function toAnimePageData(entry: LegacyStage2Fixture, index: number): AnimePageData {
  const createdAt = fixtureTimestamp(index);
  const seasonId = `season-${entry.season.year}-${entry.season.quarter}`;
  const episodeType = entry.mediaType === "movie" ? "movie" : "regular";

  return {
    anime: {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      aliases: [entry.alias],
      synopsis: entry.synopsis,
      mediaType: entry.mediaType,
      releaseStatus: entry.releaseStatus,
      tags: entry.tags,
      dataStatus: "mock",
      isMock: true,
      createdAt,
      updatedAt: createdAt,
    },
    season: {
      id: seasonId,
      year: entry.season.year,
      quarter: entry.season.quarter,
      label: `${entry.season.year}年${quarterLabel[entry.season.quarter]}季`,
      startDate: null,
      endDate: null,
      referenceTimezone: "Asia/Shanghai",
      seasonType: "broadcast",
      dataStatus: "mock",
    },
    animeSeason: {
      animeId: entry.id,
      seasonId,
      relationType: "primary",
      isPrimary: true,
      createdAt,
    },
    broadcast: {
      id: `broadcast-${entry.slug}-primary`,
      animeId: entry.id,
      broadcastType: entry.broadcast.broadcastType,
      sourceTimezone: entry.broadcast.sourceTimezone,
      sourceOriginalDateText: entry.broadcast.originalDateText,
      sourceOriginalTimeText: entry.broadcast.originalTimeText,
      originalExpression: entry.broadcast.originalExpression,
      normalizedStartAt: entry.broadcast.normalizedStartAt,
      sourceWeekday: entry.broadcast.sourceWeekday,
      availabilityState: entry.broadcast.state,
      isPrimary: true,
      isTentative: entry.broadcast.state === "tbd",
      note: "Stage 3完全虚构Fixture，仅用于Repository与页面边界验证。",
      dataStatus: "mock",
      createdAt,
      updatedAt: createdAt,
    },
    episodes: entry.episodes.map((episode, episodeIndex) => ({
      id: `episode-${entry.slug}-${episodeIndex + 1}`,
      animeId: entry.id,
      episodeType,
      sortValue: episodeIndex + 1,
      displayNumber: episode.displayNumber,
      title: episode.title,
      normalizedReleaseAt: null,
      publicationStatus: episode.state,
      isRecap: false,
      isFinal: entry.mediaType === "movie",
      dataStatus: "mock",
      createdAt,
      updatedAt: createdAt,
    })),
    staffCredits: entry.staff.map((credit, creditIndex) => ({
      id: `staff-${entry.slug}-${creditIndex + 1}`,
      animeId: entry.id,
      role: credit.role,
      name: credit.name,
      sortOrder: creditIndex,
      dataStatus: "mock",
      createdAt,
    })),
    castCredits: entry.cast.map((credit, creditIndex) => ({
      id: `cast-${entry.slug}-${creditIndex + 1}`,
      animeId: entry.id,
      characterName: credit.characterName,
      performerName: credit.performerName,
      sortOrder: creditIndex,
      dataStatus: "mock",
      createdAt,
    })),
    resourceCategories: entry.resourceCategories,
  };
}

export const STAGE3_FIXTURE_NOTICE =
  "当前页面使用Stage 3完全虚构Fixture，通过统一Repository提供，不代表真实动漫资料。";

export const stage3AnimeFixture = animePageDataArraySchema.parse(
  legacyStage2Fixture.map(toAnimePageData),
);
