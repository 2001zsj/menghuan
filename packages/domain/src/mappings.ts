import type {
  AnimeMediaType,
  AnimeReleaseStatus,
  BroadcastState,
  EpisodePublicationStatus,
  SeasonQuarter,
} from "./enums.js";

const quarterLabels: Record<SeasonQuarter, string> = {
  winter: "冬",
  spring: "春",
  summer: "夏",
  autumn: "秋",
  other: "其他",
};

const quarterValues: Record<string, SeasonQuarter> = {
  冬: "winter",
  春: "spring",
  夏: "summer",
  秋: "autumn",
  其他: "other",
};

const mediaTypeLabels: Record<AnimeMediaType, string> = {
  tv: "TV",
  short: "短篇",
  movie: "剧场版",
};

const releaseStatusLabels: Record<AnimeReleaseStatus, string> = {
  airing: "放送中",
  finished: "完结",
  upcoming: "未放送",
};

const broadcastStateLabels: Record<BroadcastState, string> = {
  updated: "已更新",
  upcoming: "即将更新",
  tbd: "时间待定",
};

const episodeStatusLabels: Record<EpisodePublicationStatus, string> = {
  published: "已更新",
  upcoming: "待更新",
  tbd: "待定",
};

export function seasonQuarterLabel(value: SeasonQuarter): string {
  return quarterLabels[value];
}

export function seasonQuarterFromLabel(value: string): SeasonQuarter | null {
  return quarterValues[value] ?? null;
}

export function animeMediaTypeLabel(value: AnimeMediaType): string {
  return mediaTypeLabels[value];
}

export function animeReleaseStatusLabel(value: AnimeReleaseStatus): string {
  return releaseStatusLabels[value];
}

export function broadcastStateLabel(value: BroadcastState): string {
  return broadcastStateLabels[value];
}

export function episodePublicationStatusLabel(value: EpisodePublicationStatus): string {
  return episodeStatusLabels[value];
}
