import {
  COLLECTION_MODES,
  DEFAULT_COLLECTION_MODE,
  getCollectionSourceLabel,
  type CollectionMode,
  type CollectionSourceType,
} from "@/lib/collection-settings";
import { expandKeywordValues } from "@/lib/keywords";
import { prisma } from "@/lib/prisma";

const BID_PUBLIC_INFO_BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const PRE_SPEC_BASE_URL = "https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService";
const ORDER_PLAN_BASE_URL = "https://apis.data.go.kr/1230000/ao/OrderPlanSttusService";

const BID_PUBLIC_INFO_ENDPOINTS = [
  "getBidPblancListInfoCnstwkPPSSrch",
  "getBidPblancListInfoServcPPSSrch",
  "getBidPblancListInfoFrgcptPPSSrch",
  "getBidPblancListInfoThngPPSSrch",
  "getBidPblancListInfoEtcPPSSrch",
] as const;
const PRE_SPEC_ENDPOINTS = [
  "getPublicPrcureThngInfoCnstwkPPSSrch",
  "getPublicPrcureThngInfoServcPPSSrch",
  "getPublicPrcureThngInfoFrgcptPPSSrch",
  "getPublicPrcureThngInfoThngPPSSrch",
] as const;
const ORDER_PLAN_ENDPOINTS = [
  "getOrderPlanSttusListThngPPSSrch",
  "getOrderPlanSttusListCnstwkPPSSrch",
  "getOrderPlanSttusListServcPPSSrch",
  "getOrderPlanSttusListFrgcptPPSSrch",
] as const;

const BID_PUBLIC_INFO_SEARCH_FIELDS = ["bidNtceNm", "ntceInsttNm", "dminsttNm"] as const;
const PRE_SPEC_SEARCH_FIELDS = ["prdctClsfcNoNm", "ntceInsttNm", "dminsttNm"] as const;
const ORDER_PLAN_SEARCH_FIELDS = ["bizNm", "orderInsttNm"] as const;

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_NUM_ROWS = 100;
const DEFAULT_MAX_PAGES_PER_ENDPOINT = 10;
const DEFAULT_API_CONCURRENCY = 4;
const MAX_API_CONCURRENCY = 8;

export type CollectionProgress = {
  phase: string;
  current: number;
  total: number;
  keyword?: string;
  endpoint?: string;
  source?: string;
  scannedCount: number;
  importedCount: number;
  refreshedCount: number;
  totalMatches: number;
  excludedCount: number;
};

type CollectBidNoticesOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: CollectionProgress) => void;
};

type ApiBidNotice = {
  sourceType: CollectionSourceType;
  bidNtceNo: string;
  bidNtceOrd: string;
  title: string;
  organization: string;
  noticeDate: string | null;
  closeDate: string | null;
  postedDate: string | null;
  activeStartDate: string | null;
  activeEndDate: string | null;
  baseAmount: number | null;
  detailUrl?: string;
  matchText: string;
  rawJson?: string;
};

type G2bApiItem = Record<string, unknown>;
type G2bApiItems = G2bApiItem[] | G2bApiItem | "";

type G2bApiResponse = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: G2bApiItems;
      totalCount?: number | string;
    };
  };
};

type ApiQueryRange = ReturnType<typeof getApiQueryRange>;

type SourceConfig = {
  sourceType: CollectionSourceType;
  baseUrl: string;
  endpoints: readonly string[];
  searchFields: readonly string[];
  buildParams: (url: URL, range: ApiQueryRange, mode: CollectionMode) => void;
  mapItem: (item: G2bApiItem) => ApiBidNotice | null;
};

type ScheduleCollectionSettings = {
  collectBidNotices: boolean;
  collectPreSpecs: boolean;
  collectOrderPlans: boolean;
  collectionMode: CollectionMode;
};

export class CollectionCancelledError extends Error {
  constructor() {
    super("수집이 중지되었습니다.");
    this.name = "CollectionCancelledError";
  }
}

function assertNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new CollectionCancelledError();
  }
}

function emitProgress(options: CollectBidNoticesOptions | undefined, progress: CollectionProgress) {
  options?.onProgress?.(progress);
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text: string, keyword: string) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return false;
  }

  if (/^[a-z0-9]{1,3}$/i.test(trimmedKeyword)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(trimmedKeyword)}([^a-z0-9]|$)`, "i").test(
      text,
    );
  }

  return normalize(text).includes(normalize(trimmedKeyword));
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getApiConcurrency() {
  return Math.min(
    toPositiveInteger(process.env.G2B_API_CONCURRENCY, DEFAULT_API_CONCURRENCY),
    MAX_API_CONCURRENCY,
  );
}

async function runConcurrently<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
      }
    }),
  );
}

function getKoreanTodayBounds(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(date);

  return {
    start: new Date(`${today}T00:00:00+09:00`),
    end: new Date(`${today}T23:59:59.999+09:00`),
  };
}

function getKoreanDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
}

function formatKoreanApiDate(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`;
}

function getApiQueryRange(date = new Date()) {
  const lookbackDays = toPositiveInteger(
    process.env.G2B_API_LOOKBACK_DAYS,
    DEFAULT_LOOKBACK_DAYS,
  );
  const { end } = getKoreanTodayBounds(date);
  const start = new Date(end);
  start.setDate(start.getDate() - (lookbackDays - 1));
  start.setHours(0, 0, 0, 0);

  return {
    begin: formatKoreanApiDate(start),
    end: formatKoreanApiDate(end),
  };
}

function getOrderPlanQueryMonthRange(mode: CollectionMode, date = new Date()) {
  const parts = getKoreanDateParts(date);
  const begin = `${parts.year}${parts.month}`;
  const end = mode === "postedToday" ? `${parts.year}12` : begin;

  return { begin, end };
}

function parseG2bDate(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  if (/^\d{12}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:00+09:00`;
  }

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

function parseAmount(value: string | null | undefined) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeApiItems(items: G2bApiItems | undefined) {
  if (!items) {
    return [];
  }

  return Array.isArray(items) ? items : [items];
}

function textValue(item: G2bApiItem, key: string) {
  return String(item[key] ?? "").trim();
}

function firstText(item: G2bApiItem, keys: string[]) {
  for (const key of keys) {
    const value = textValue(item, key);
    if (value) {
      return value;
    }
  }

  return "";
}

function stringifyRawJson(item: G2bApiItem) {
  try {
    return JSON.stringify(item);
  } catch {
    return undefined;
  }
}

function joinMatchText(values: Array<string | null | undefined>) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function getOrderMonthBounds(item: G2bApiItem) {
  const year = textValue(item, "orderYear");
  const rawMonth = textValue(item, "orderMnth");
  const month = rawMonth.length === 1 ? `0${rawMonth}` : rawMonth.slice(-2);

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return { start: null, end: null };
  }

  const start = new Date(`${year}-${month}-01T00:00:00+09:00`);
  if (Number.isNaN(start.getTime())) {
    return { start: null, end: null };
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function mapBidNoticeItem(item: G2bApiItem): ApiBidNotice | null {
  const bidNtceNo = textValue(item, "bidNtceNo");
  const title = textValue(item, "bidNtceNm");

  if (!bidNtceNo || !title) {
    return null;
  }

  const organization = firstText(item, ["dminsttNm", "ntceInsttNm"]);
  const noticeDate = parseG2bDate(firstText(item, ["bidNtceDt", "rgstDt"]));
  const closeDate = parseG2bDate(firstText(item, ["bidClseDt", "opengDt"]));

  return {
    sourceType: "bid_notice",
    bidNtceNo,
    bidNtceOrd: textValue(item, "bidNtceOrd") || "000",
    title,
    organization,
    noticeDate,
    closeDate,
    postedDate: noticeDate,
    activeStartDate: noticeDate,
    activeEndDate: closeDate,
    baseAmount: parseAmount(firstText(item, ["presmptPrce", "asignBdgtAmt"])),
    detailUrl: firstText(item, ["bidNtceDtlUrl", "bidNtceUrl"]),
    matchText: joinMatchText([title, organization]),
    rawJson: stringifyRawJson(item),
  };
}

function mapPreSpecItem(item: G2bApiItem): ApiBidNotice | null {
  const bfSpecRgstNo = textValue(item, "bfSpecRgstNo");
  const refNo = textValue(item, "refNo");
  const sourceKey = bfSpecRgstNo || refNo;
  const title = firstText(item, ["prdctClsfcNoNm", "prdctDtlList", "refNo"]);

  if (!sourceKey || !title) {
    return null;
  }

  const organization = firstText(item, ["rlDminsttNm", "dminsttNm", "orderInsttNm", "ntceInsttNm"]);
  const noticeDate = parseG2bDate(firstText(item, ["rgstDt", "rcptDt", "chgDt"]));
  const closeDate = parseG2bDate(firstText(item, ["opninRgstClseDt", "dlvrTmlmtDt"]));

  return {
    sourceType: "pre_spec",
    bidNtceNo: sourceKey,
    bidNtceOrd: "000",
    title,
    organization,
    noticeDate,
    closeDate,
    postedDate: noticeDate,
    activeStartDate: noticeDate,
    activeEndDate: closeDate,
    baseAmount: parseAmount(textValue(item, "asignBdgtAmt")),
    detailUrl: firstText(item, [
      "specDocFileUrl1",
      "specDocFileUrl2",
      "specDocFileUrl3",
      "specDocFileUrl4",
      "specDocFileUrl5",
    ]),
    matchText: joinMatchText([
      title,
      organization,
      refNo,
      textValue(item, "prdctDtlList"),
      textValue(item, "bsnsDivNm"),
    ]),
    rawJson: stringifyRawJson(item),
  };
}

function mapOrderPlanItem(item: G2bApiItem): ApiBidNotice | null {
  const sourceKey =
    textValue(item, "orderPlanUntyNo") ||
    joinMatchText([
      textValue(item, "orderYear"),
      textValue(item, "orderMnth"),
      textValue(item, "orderInsttCd"),
      textValue(item, "orderPlanSno"),
      textValue(item, "bizNm"),
    ]);
  const title = firstText(item, ["bizNm", "prdctClsfcNoNm", "dtilPrdctClsfcNoNm"]);

  if (!sourceKey || !title) {
    return null;
  }

  const organization = textValue(item, "orderInsttNm");
  const postedDate = parseG2bDate(firstText(item, ["nticeDt", "chgDt"]));
  const orderMonthBounds = getOrderMonthBounds(item);

  return {
    sourceType: "order_plan",
    bidNtceNo: sourceKey,
    bidNtceOrd: textValue(item, "orderPlanSno") || "000",
    title,
    organization,
    noticeDate: postedDate ?? orderMonthBounds.start,
    closeDate: orderMonthBounds.end,
    postedDate,
    activeStartDate: orderMonthBounds.start,
    activeEndDate: orderMonthBounds.end,
    baseAmount: parseAmount(
      firstText(item, ["sumOrderAmt", "orderContrctAmt", "orderThtmContrctAmt"]),
    ),
    detailUrl: "",
    matchText: joinMatchText([
      title,
      organization,
      textValue(item, "prdctClsfcNoNm"),
      textValue(item, "dtilPrdctClsfcNoNm"),
      textValue(item, "specCntnts"),
      textValue(item, "bsnsTyNm"),
    ]),
    rawJson: stringifyRawJson(item),
  };
}

const SOURCE_CONFIGS: SourceConfig[] = [
  {
    sourceType: "bid_notice",
    baseUrl: BID_PUBLIC_INFO_BASE_URL,
    endpoints: BID_PUBLIC_INFO_ENDPOINTS,
    searchFields: BID_PUBLIC_INFO_SEARCH_FIELDS,
    buildParams: (url, range) => {
      url.searchParams.set("inqryDiv", "1");
      url.searchParams.set("inqryBgnDt", range.begin);
      url.searchParams.set("inqryEndDt", range.end);
    },
    mapItem: mapBidNoticeItem,
  },
  {
    sourceType: "pre_spec",
    baseUrl: PRE_SPEC_BASE_URL,
    endpoints: PRE_SPEC_ENDPOINTS,
    searchFields: PRE_SPEC_SEARCH_FIELDS,
    buildParams: (url, range) => {
      url.searchParams.set("inqryDiv", "1");
      url.searchParams.set("inqryBgnDt", range.begin);
      url.searchParams.set("inqryEndDt", range.end);
    },
    mapItem: mapPreSpecItem,
  },
  {
    sourceType: "order_plan",
    baseUrl: ORDER_PLAN_BASE_URL,
    endpoints: ORDER_PLAN_ENDPOINTS,
    searchFields: ORDER_PLAN_SEARCH_FIELDS,
    buildParams: (url, range, mode) => {
      const monthRange = getOrderPlanQueryMonthRange(mode);
      url.searchParams.set("orderBgnYm", monthRange.begin);
      url.searchParams.set("orderEndYm", monthRange.end);
      url.searchParams.set("inqryBgnDt", range.begin);
      url.searchParams.set("inqryEndDt", range.end);
    },
    mapItem: mapOrderPlanItem,
  },
];

function normalizeCollectionMode(value: string | null | undefined): CollectionMode {
  return COLLECTION_MODES.includes(value as CollectionMode)
    ? (value as CollectionMode)
    : DEFAULT_COLLECTION_MODE;
}

function getEnabledSourceConfigs(settings: ScheduleCollectionSettings) {
  return SOURCE_CONFIGS.filter((config) => {
    if (config.sourceType === "bid_notice") {
      return settings.collectBidNotices;
    }

    if (config.sourceType === "pre_spec") {
      return settings.collectPreSpecs;
    }

    return settings.collectOrderPlans;
  });
}

async function getScheduleCollectionSettings(userId: string): Promise<ScheduleCollectionSettings> {
  const schedule = await prisma.scheduleSetting.findFirst({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      collectBidNotices: true,
      collectPreSpecs: true,
      collectOrderPlans: true,
      collectionMode: true,
    },
  });

  return {
    collectBidNotices: schedule?.collectBidNotices ?? true,
    collectPreSpecs: schedule?.collectPreSpecs ?? false,
    collectOrderPlans: schedule?.collectOrderPlans ?? false,
    collectionMode: normalizeCollectionMode(schedule?.collectionMode),
  };
}

function isDateWithinToday(value: string | null | undefined) {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  const { start, end } = getKoreanTodayBounds();
  return date >= start && date <= end;
}

function isNoticeActiveToday(notice: ApiBidNotice) {
  const startDate = toDate(notice.activeStartDate ?? notice.noticeDate);
  const endDate = toDate(notice.activeEndDate ?? notice.closeDate);

  if (!startDate || !endDate) {
    return false;
  }

  const { start, end } = getKoreanTodayBounds();
  return startDate <= end && endDate >= start;
}

function matchesCollectionMode(notice: ApiBidNotice, mode: CollectionMode) {
  if (mode === "postedToday") {
    return isDateWithinToday(notice.postedDate ?? notice.noticeDate);
  }

  return isNoticeActiveToday(notice);
}

async function fetchApiPage(
  config: SourceConfig,
  endpoint: string,
  pageNo: number,
  range: ApiQueryRange,
  mode: CollectionMode,
  query?: { field: string; keyword: string },
  signal?: AbortSignal,
) {
  const serviceKey = process.env.G2B_API_SERVICE_KEY?.trim();

  if (!serviceKey) {
    throw new Error("G2B_API_SERVICE_KEY가 설정되지 않았습니다.");
  }

  const numOfRows = toPositiveInteger(process.env.G2B_API_NUM_ROWS, DEFAULT_NUM_ROWS);
  const url = new URL(`${config.baseUrl}/${endpoint}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("type", "json");
  config.buildParams(url, range, mode);
  if (query) {
    url.searchParams.set(query.field, query.keyword);
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(
      `${getCollectionSourceLabel(config.sourceType)} API 호출 실패: ${response.status}`,
    );
  }

  const data = (await response.json()) as G2bApiResponse;
  const resultCode = data.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    if (resultCode === "03") {
      return {
        items: [],
        totalCount: 0,
        numOfRows,
      };
    }

    throw new Error(
      data.response?.header?.resultMsg ??
        `${getCollectionSourceLabel(config.sourceType)} API 응답 오류`,
    );
  }

  const body = data.response?.body;
  return {
    items: normalizeApiItems(body?.items),
    totalCount: Number(body?.totalCount ?? 0),
    numOfRows,
  };
}

async function loadBidNotices(
  keywords: string[],
  settings: ScheduleCollectionSettings,
  options?: CollectBidNoticesOptions,
) {
  const configs = getEnabledSourceConfigs(settings);
  const range = getApiQueryRange();
  const maxPages = toPositiveInteger(
    process.env.G2B_API_MAX_PAGES_PER_ENDPOINT,
    DEFAULT_MAX_PAGES_PER_ENDPOINT,
  );
  const apiConcurrency = getApiConcurrency();
  const totalApiCalls = configs.reduce(
    (total, config) =>
      total + keywords.length * config.endpoints.length * config.searchFields.length * maxPages,
    0,
  );
  let completedApiCalls = 0;
  let scannedCount = 0;
  const notices = new Map<string, ApiBidNotice>();
  const searchTasks = keywords.flatMap((keyword) =>
    configs.flatMap((config) =>
      config.endpoints.flatMap((endpoint) =>
        config.searchFields.map((field) => ({
          config,
          keyword,
          endpoint,
          field,
        })),
      ),
    ),
  );

  emitProgress(options, {
    phase: "공식 API 조회 준비",
    current: 0,
    total: Math.max(totalApiCalls, 1),
    scannedCount,
    importedCount: 0,
    refreshedCount: 0,
    totalMatches: 0,
    excludedCount: 0,
  });

  await runConcurrently(searchTasks, apiConcurrency, async ({ config, keyword, endpoint, field }) => {
    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
      assertNotCancelled(options?.signal);
      const page = await fetchApiPage(
        config,
        endpoint,
        pageNo,
        range,
        settings.collectionMode,
        { field, keyword },
        options?.signal,
      );
      completedApiCalls += 1;
      scannedCount += page.items.length;

      for (const item of page.items) {
        const notice = config.mapItem(item);
        if (notice) {
          notices.set(`${notice.sourceType}:${notice.bidNtceNo}:${notice.bidNtceOrd}`, notice);
        }
      }

      emitProgress(options, {
        phase: "공식 API 조회 중",
        current: completedApiCalls,
        total: Math.max(totalApiCalls, 1),
        keyword,
        endpoint,
        source: getCollectionSourceLabel(config.sourceType),
        scannedCount,
        importedCount: 0,
        refreshedCount: 0,
        totalMatches: 0,
        excludedCount: 0,
      });

      if (page.items.length === 0 || pageNo * page.numOfRows >= page.totalCount) {
        break;
      }
    }
  });

  return {
    notices: Array.from(notices.values()),
    source: "official-api" as const,
    scannedCount,
  };
}

export async function collectBidNotices(userId: string, options?: CollectBidNoticesOptions) {
  assertNotCancelled(options?.signal);
  const [keywordRules, settings] = await Promise.all([
    prisma.keywordRule.findMany({
      where: {
        userId,
        active: true,
      },
      select: {
        keyword: true,
        type: true,
      },
    }),
    getScheduleCollectionSettings(userId),
  ]);

  const includeKeywords = keywordRules
    .filter((item) => item.type === "include")
    .map((item) => item.keyword.trim())
    .filter(Boolean);
  const excludeKeywords = keywordRules
    .filter((item) => item.type === "exclude")
    .map((item) => item.keyword.trim())
    .filter(Boolean);
  const expandedIncludeKeywords = expandKeywordValues(includeKeywords);
  const expandedExcludeKeywords = expandKeywordValues(excludeKeywords);
  const enabledSources = getEnabledSourceConfigs(settings);

  emitProgress(options, {
    phase: "키워드 설정 확인",
    current: 0,
    total: 1,
    scannedCount: 0,
    importedCount: 0,
    refreshedCount: 0,
    totalMatches: 0,
    excludedCount: 0,
  });

  if (expandedIncludeKeywords.length === 0 || enabledSources.length === 0) {
    return {
      importedCount: 0,
      totalMatches: 0,
      excludedCount: 0,
      keywords: expandedIncludeKeywords,
      source: "official-api" as const,
      scannedCount: 0,
      refreshedCount: 0,
    };
  }

  const { notices, source, scannedCount } = await loadBidNotices(
    expandedIncludeKeywords,
    settings,
    options,
  );

  let importedCount = 0;
  let refreshedCount = 0;
  let totalMatches = 0;
  let excludedCount = 0;
  let processedNotices = 0;

  emitProgress(options, {
    phase: "필터링 및 저장 준비",
    current: 0,
    total: notices.length,
    scannedCount,
    importedCount,
    refreshedCount,
    totalMatches,
    excludedCount,
  });

  for (const notice of notices) {
    assertNotCancelled(options?.signal);
    processedNotices += 1;

    if (!matchesCollectionMode(notice, settings.collectionMode)) {
      emitProgress(options, {
        phase:
          settings.collectionMode === "postedToday"
            ? "당일 등록 기준 필터링"
            : "오늘 포함 기준 필터링",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        refreshedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    const matchedKeyword = expandedIncludeKeywords.find((keyword) =>
      keywordMatches(notice.matchText, keyword),
    );

    if (!matchedKeyword) {
      emitProgress(options, {
        phase: "키워드 매칭 중",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        refreshedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    const blockedKeyword = expandedExcludeKeywords.find((keyword) =>
      keywordMatches(notice.matchText, keyword),
    );

    if (blockedKeyword) {
      excludedCount += 1;
      emitProgress(options, {
        phase: "제외 키워드 필터링",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        refreshedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    totalMatches += 1;

    const bidNotice = await prisma.bidNotice.upsert({
      where: {
        sourceType_bidNtceNo_bidNtceOrd: {
          sourceType: notice.sourceType,
          bidNtceNo: notice.bidNtceNo,
          bidNtceOrd: notice.bidNtceOrd,
        },
      },
      create: {
        sourceType: notice.sourceType,
        bidNtceNo: notice.bidNtceNo,
        bidNtceOrd: notice.bidNtceOrd,
        title: notice.title,
        organization: notice.organization,
        noticeDate: toDate(notice.noticeDate),
        closeDate: toDate(notice.closeDate),
        baseAmount: notice.baseAmount,
        detailUrl: notice.detailUrl,
        rawJson: notice.rawJson,
      },
      update: {
        title: notice.title,
        organization: notice.organization,
        noticeDate: toDate(notice.noticeDate),
        closeDate: toDate(notice.closeDate),
        baseAmount: notice.baseAmount,
        detailUrl: notice.detailUrl,
        rawJson: notice.rawJson,
      },
      select: {
        id: true,
      },
    });

    const existing = await prisma.collectedResult.findUnique({
      where: {
        bidNoticeId_userId: {
          bidNoticeId: bidNotice.id,
          userId,
        },
      },
      select: {
        id: true,
        emailedAt: true,
      },
    });

    if (settings.collectionMode === "unreported" && existing?.emailedAt) {
      excludedCount += 1;
      emitProgress(options, {
        phase: "보고 완료 공고 제외",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        refreshedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    if (!existing) {
      await prisma.collectedResult.create({
        data: {
          bidNoticeId: bidNotice.id,
          userId,
          matchedKeyword,
          status: "collected",
        },
      });
      importedCount += 1;
    } else {
      await prisma.collectedResult.update({
        where: {
          id: existing.id,
        },
        data: {
          matchedKeyword,
          collectedAt: new Date(),
          status: "collected",
        },
      });
      refreshedCount += 1;
    }

    emitProgress(options, {
      phase: "공고 저장 중",
      current: processedNotices,
      total: notices.length,
      keyword: matchedKeyword,
      source: getCollectionSourceLabel(notice.sourceType),
      scannedCount,
      importedCount,
      refreshedCount,
      totalMatches,
      excludedCount,
    });
  }

  emitProgress(options, {
    phase: "수집 완료",
    current: notices.length,
    total: notices.length,
    scannedCount,
    importedCount,
    refreshedCount,
    totalMatches,
    excludedCount,
  });

  return {
    importedCount,
    refreshedCount,
    totalMatches,
    keywords: expandedIncludeKeywords,
    excludedCount,
    source,
    scannedCount,
  };
}
