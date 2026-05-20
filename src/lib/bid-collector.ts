import { expandKeywordValues } from "@/lib/keywords";
import { prisma } from "@/lib/prisma";

const G2B_API_BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const G2B_API_ENDPOINTS = [
  "getBidPblancListInfoCnstwkPPSSrch",
  "getBidPblancListInfoServcPPSSrch",
  "getBidPblancListInfoFrgcptPPSSrch",
  "getBidPblancListInfoThngPPSSrch",
  "getBidPblancListInfoEtcPPSSrch",
] as const;
const G2B_API_SEARCH_FIELDS = ["bidNtceNm", "ntceInsttNm", "dminsttNm"] as const;
const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_NUM_ROWS = 100;
const DEFAULT_MAX_PAGES_PER_ENDPOINT = 10;

export type CollectionProgress = {
  phase: string;
  current: number;
  total: number;
  keyword?: string;
  endpoint?: string;
  scannedCount: number;
  importedCount: number;
  totalMatches: number;
  excludedCount: number;
};

type CollectBidNoticesOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: CollectionProgress) => void;
};

type ApiBidNotice = {
  bidNtceNo: string;
  bidNtceOrd: string;
  title: string;
  organization: string;
  noticeDate: string | null;
  closeDate: string | null;
  baseAmount: number | null;
  detailUrl?: string;
};

type G2bApiItem = {
  bidNtceNo: string;
  bidNtceOrd?: string;
  bidNtceNm?: string;
  ntceInsttNm?: string;
  dminsttNm?: string;
  bidNtceDt?: string;
  rgstDt?: string;
  bidClseDt?: string;
  opengDt?: string;
  presmptPrce?: string;
  asignBdgtAmt?: string;
  bidNtceDtlUrl?: string;
  bidNtceUrl?: string;
};

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

function mapApiItem(item: G2bApiItem): ApiBidNotice | null {
  const bidNtceNo = String(item.bidNtceNo ?? "").trim();
  const title = String(item.bidNtceNm ?? "").trim();

  if (!bidNtceNo || !title) {
    return null;
  }

  return {
    bidNtceNo,
    bidNtceOrd: String(item.bidNtceOrd ?? "000").trim() || "000",
    title,
    organization: String(item.dminsttNm || item.ntceInsttNm || "").trim(),
    noticeDate: parseG2bDate(item.bidNtceDt || item.rgstDt),
    closeDate: parseG2bDate(item.bidClseDt || item.opengDt),
    baseAmount: parseAmount(item.presmptPrce || item.asignBdgtAmt),
    detailUrl: item.bidNtceDtlUrl || item.bidNtceUrl,
  };
}

function isNoticeOpenToday(notice: ApiBidNotice) {
  const noticeDate = toDate(notice.noticeDate);
  const closeDate = toDate(notice.closeDate);

  if (!noticeDate || !closeDate) {
    return false;
  }

  const { start, end } = getKoreanTodayBounds();
  return noticeDate <= end && closeDate >= start;
}

async function fetchApiPage(
  endpoint: string,
  pageNo: number,
  range: ReturnType<typeof getApiQueryRange>,
  query?: { field: (typeof G2B_API_SEARCH_FIELDS)[number]; keyword: string },
  signal?: AbortSignal,
) {
  const serviceKey = process.env.G2B_API_SERVICE_KEY?.trim();

  if (!serviceKey) {
    throw new Error("G2B_API_SERVICE_KEY가 설정되지 않았습니다.");
  }

  const numOfRows = toPositiveInteger(process.env.G2B_API_NUM_ROWS, DEFAULT_NUM_ROWS);
  const url = new URL(`${G2B_API_BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("type", "json");
  url.searchParams.set("inqryDiv", "1");
  url.searchParams.set("inqryBgnDt", range.begin);
  url.searchParams.set("inqryEndDt", range.end);
  if (query) {
    url.searchParams.set(query.field, query.keyword);
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`나라장터 API 호출 실패: ${response.status}`);
  }

  const data = (await response.json()) as G2bApiResponse;
  const resultCode = data.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    throw new Error(data.response?.header?.resultMsg ?? "나라장터 API 응답 오류");
  }

  const body = data.response?.body;
  return {
    items: normalizeApiItems(body?.items),
    totalCount: Number(body?.totalCount ?? 0),
    numOfRows,
  };
}

async function loadBidNotices(keywords: string[], options?: CollectBidNoticesOptions) {
  const range = getApiQueryRange();
  const maxPages = toPositiveInteger(
    process.env.G2B_API_MAX_PAGES_PER_ENDPOINT,
    DEFAULT_MAX_PAGES_PER_ENDPOINT,
  );
  const totalApiCalls =
    keywords.length * G2B_API_ENDPOINTS.length * G2B_API_SEARCH_FIELDS.length * maxPages;
  let completedApiCalls = 0;
  let scannedCount = 0;
  const notices = new Map<string, ApiBidNotice>();

  emitProgress(options, {
    phase: "공식 API 조회 준비",
    current: 0,
    total: totalApiCalls,
    scannedCount,
    importedCount: 0,
    totalMatches: 0,
    excludedCount: 0,
  });

  for (const keyword of keywords) {
    for (const endpoint of G2B_API_ENDPOINTS) {
      for (const field of G2B_API_SEARCH_FIELDS) {
        for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
          assertNotCancelled(options?.signal);
          const page = await fetchApiPage(
            endpoint,
            pageNo,
            range,
            { field, keyword },
            options?.signal,
          );
          completedApiCalls += 1;
          scannedCount += page.items.length;

          for (const item of page.items) {
            const notice = mapApiItem(item);
            if (notice) {
              notices.set(`${notice.bidNtceNo}:${notice.bidNtceOrd}`, notice);
            }
          }

          emitProgress(options, {
            phase: "공식 API 조회 중",
            current: completedApiCalls,
            total: totalApiCalls,
            keyword,
            endpoint,
            scannedCount,
            importedCount: 0,
            totalMatches: 0,
            excludedCount: 0,
          });

          if (page.items.length === 0 || pageNo * page.numOfRows >= page.totalCount) {
            break;
          }
        }
      }
    }
  }

  return {
    notices: Array.from(notices.values()),
    source: "official-api" as const,
    scannedCount,
  };
}

export async function collectBidNotices(userId: string, options?: CollectBidNoticesOptions) {
  assertNotCancelled(options?.signal);
  const keywordRules = await prisma.keywordRule.findMany({
    where: {
      userId,
      active: true,
    },
    select: {
      keyword: true,
      type: true,
    },
  });

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

  emitProgress(options, {
    phase: "키워드 설정 확인",
    current: 0,
    total: 1,
    scannedCount: 0,
    importedCount: 0,
    totalMatches: 0,
    excludedCount: 0,
  });

  if (expandedIncludeKeywords.length === 0) {
    return {
      importedCount: 0,
      totalMatches: 0,
      excludedCount: 0,
      keywords: [],
      source: "official-api" as const,
      scannedCount: 0,
    };
  }

  const { notices, source, scannedCount } = await loadBidNotices(expandedIncludeKeywords, options);

  let importedCount = 0;
  let totalMatches = 0;
  let excludedCount = 0;
  let processedNotices = 0;

  emitProgress(options, {
    phase: "필터링 및 저장 준비",
    current: 0,
    total: notices.length,
    scannedCount,
    importedCount,
    totalMatches,
    excludedCount,
  });

  for (const notice of notices) {
    assertNotCancelled(options?.signal);
    processedNotices += 1;

    if (!isNoticeOpenToday(notice)) {
      emitProgress(options, {
        phase: "오늘 포함 공고 필터링",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    const noticeText = `${notice.title} ${notice.organization ?? ""}`;
    const matchedKeyword = expandedIncludeKeywords.find((keyword) =>
      keywordMatches(noticeText, keyword),
    );

    if (!matchedKeyword) {
      emitProgress(options, {
        phase: "키워드 매칭 중",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    const blockedKeyword = expandedExcludeKeywords.find((keyword) =>
      keywordMatches(noticeText, keyword),
    );

    if (blockedKeyword) {
      excludedCount += 1;
      emitProgress(options, {
        phase: "제외 키워드 필터링",
        current: processedNotices,
        total: notices.length,
        scannedCount,
        importedCount,
        totalMatches,
        excludedCount,
      });
      continue;
    }

    totalMatches += 1;

    const bidNotice = await prisma.bidNotice.upsert({
      where: {
        bidNtceNo_bidNtceOrd: {
          bidNtceNo: notice.bidNtceNo,
          bidNtceOrd: notice.bidNtceOrd,
        },
      },
      create: {
        bidNtceNo: notice.bidNtceNo,
        bidNtceOrd: notice.bidNtceOrd,
        title: notice.title,
        organization: notice.organization,
        noticeDate: toDate(notice.noticeDate),
        closeDate: toDate(notice.closeDate),
        baseAmount: notice.baseAmount,
        detailUrl: notice.detailUrl,
      },
      update: {
        title: notice.title,
        organization: notice.organization,
        noticeDate: toDate(notice.noticeDate),
        closeDate: toDate(notice.closeDate),
        baseAmount: notice.baseAmount,
        detailUrl: notice.detailUrl,
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
      },
    });

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
    }

    emitProgress(options, {
      phase: "공고 저장 중",
      current: processedNotices,
      total: notices.length,
      keyword: matchedKeyword,
      scannedCount,
      importedCount,
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
    totalMatches,
    excludedCount,
  });

  return {
    importedCount,
    totalMatches,
    keywords: expandedIncludeKeywords,
    excludedCount,
    source,
    scannedCount,
  };
}
