export const COLLECTION_SOURCE_TYPES = ["bid_notice", "pre_spec", "order_plan"] as const;

export type CollectionSourceType = (typeof COLLECTION_SOURCE_TYPES)[number];

export const COLLECTION_SOURCE_LABELS: Record<CollectionSourceType, string> = {
  bid_notice: "입찰공고",
  pre_spec: "사전규격",
  order_plan: "발주계획",
};

export const COLLECTION_MODES = ["activeToday", "postedToday", "unreported"] as const;

export type CollectionMode = (typeof COLLECTION_MODES)[number];

export const COLLECTION_MODE_LABELS: Record<CollectionMode, string> = {
  activeToday: "당일이 포함된 공고",
  postedToday: "당일에 올라온 공고",
  unreported: "보고된 공고 제외",
};

export const DEFAULT_COLLECTION_MODE: CollectionMode = "activeToday";

export function getCollectionSourceLabel(value: string | null | undefined) {
  return COLLECTION_SOURCE_LABELS[value as CollectionSourceType] ?? "입찰공고";
}

export function getCollectionModeLabel(value: string | null | undefined) {
  return COLLECTION_MODE_LABELS[value as CollectionMode] ?? COLLECTION_MODE_LABELS.activeToday;
}
