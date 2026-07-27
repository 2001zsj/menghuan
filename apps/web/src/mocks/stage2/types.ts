export type MockBroadcastState = "updated" | "upcoming" | "tbd";
export type MockAnimeStatus = "放送中" | "完结" | "未放送";
export type MockAnimeFormat = "TV" | "短篇" | "剧场版";
export type MockResourceCategory =
  | "official_site"
  | "official_social"
  | "official_video_channel"
  | "broadcaster"
  | "verified_licensed_streaming"
  | "distributor"
  | "encyclopedia"
  | "rating_site"
  | "database"
  | "news"
  | "search"
  | "approved_other";

export interface Stage2MockAnime {
  id: string;
  slug: string;
  title: string;
  alias: string;
  synopsis: string;
  season: { year: number; quarter: "冬" | "春" | "夏" | "秋" };
  status: MockAnimeStatus;
  format: MockAnimeFormat;
  tags: string[];
  isMock: true;
  broadcast: {
    state: MockBroadcastState;
    originalText: string;
    sourceTimezone: "Asia/Tokyo" | "Asia/Shanghai" | null;
    normalizedIso: string | null;
  };
  staff: Array<{ role: string; name: string }>;
  cast: Array<{ character: string; performer: string }>;
  episodes: Array<{ number: number; title: string; state: "已更新" | "待更新" }>;
  resourceCategories: MockResourceCategory[];
}
