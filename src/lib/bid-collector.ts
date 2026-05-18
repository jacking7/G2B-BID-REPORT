import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

type ScrapedBidNotice = {
  bidNtceNo: string;
  bidNtceOrd: string;
  title: string;
  organization: string;
  noticeDate: string | null;
  closeDate: string | null;
  baseAmount: number | null;
  detailUrl?: string;
};

type SampleBidNotice = {
  bidNtceNo: string;
  bidNtceOrd: string;
  title: string;
  organization: string;
  noticeDate: string;
  closeDate: string;
  baseAmount: number;
  detailUrl?: string;
};

const sampleBidNotices: SampleBidNotice[] = [
  {
    bidNtceNo: "R26BK01429611",
    bidNtceOrd: "000",
    title: "연암대학교 전문대학 혁신지원사업 성과 공유 확산 플랫폼 운영업체 선정",
    organization: "연암대학교 산학협력단",
    noticeDate: "2026-03-30T14:58:00+09:00",
    closeDate: "2026-04-07T14:00:00+09:00",
    baseAmount: 90909091,
    detailUrl: "https://www.g2b.go.kr/",
  },
  {
    bidNtceNo: "R26BK01420197",
    bidNtceOrd: "000",
    title: "2026년도 신안군 CCTV통합관제센터 유지보수 용역",
    organization: "전라남도 신안군",
    noticeDate: "2026-03-30T14:53:00+09:00",
    closeDate: "2026-04-10T10:00:00+09:00",
    baseAmount: 131636364,
    detailUrl: "https://www.g2b.go.kr/",
  },
  {
    bidNtceNo: "R26BK01428694",
    bidNtceOrd: "000",
    title: "현장문제 해결 기술 징검다리 모델 구축 사업",
    organization: "농림식품기술기획평가원",
    noticeDate: "2026-03-30T14:42:00+09:00",
    closeDate: "2026-04-10T10:00:00+09:00",
    baseAmount: 181818182,
    detailUrl: "https://www.g2b.go.kr/",
  },
  {
    bidNtceNo: "R26BK01429437",
    bidNtceOrd: "000",
    title: "2026년 교육 공공데이터 제공운영 컨설팅 사업",
    organization: "한국교육학술정보원",
    noticeDate: "2026-03-30T14:38:00+09:00",
    closeDate: "2026-04-10T10:00:00+09:00",
    baseAmount: 45454545,
    detailUrl: "https://www.g2b.go.kr/",
  },
  {
    bidNtceNo: "R26BK01428823",
    bidNtceOrd: "000",
    title: "IBK 기업디지털마케팅 콘텐츠 제작 대행사 선정",
    organization: "중소기업은행",
    noticeDate: "2026-03-30T14:43:00+09:00",
    closeDate: "2026-04-10T12:00:00+09:00",
    baseAmount: 227272727,
    detailUrl: "https://www.g2b.go.kr/",
  },
];

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
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

function isNoticeOpenToday(notice: ScrapedBidNotice | SampleBidNotice) {
  const noticeDate = toDate(notice.noticeDate);
  const closeDate = toDate(notice.closeDate);

  if (!noticeDate || !closeDate) {
    return false;
  }

  const { start, end } = getKoreanTodayBounds();
  return noticeDate <= end && closeDate >= start;
}

async function scrapeLiveBidNotices() {
  const scriptPath = path.join(process.cwd(), "scripts", "collect-g2bplus.cjs");
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as { notices?: ScrapedBidNotice[] };
  return parsed.notices ?? [];
}

async function loadBidNotices() {
  try {
    const notices = await scrapeLiveBidNotices();
    if (notices.length > 0) {
      return {
        notices,
        source: "live" as const,
      };
    }
  } catch {
    // fall back to sample data when live scraping is unavailable
  }

  return {
    notices: sampleBidNotices,
    source: "sample" as const,
  };
}

export async function collectBidNotices(userId: string) {
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

  if (includeKeywords.length === 0) {
    return {
      importedCount: 0,
      totalMatches: 0,
      excludedCount: 0,
      keywords: [],
      source: "sample" as const,
    };
  }

  const { notices, source } = await loadBidNotices();

  let importedCount = 0;
  let totalMatches = 0;
  let excludedCount = 0;

  for (const notice of notices) {
    if (!isNoticeOpenToday(notice)) {
      continue;
    }

    const noticeText = `${notice.title} ${notice.organization ?? ""}`;
    const matchedKeyword = includeKeywords.find((keyword) =>
      normalize(noticeText).includes(normalize(keyword)),
    );

    if (!matchedKeyword) {
      continue;
    }

    const blockedKeyword = excludeKeywords.find((keyword) =>
      normalize(noticeText).includes(normalize(keyword)),
    );

    if (blockedKeyword) {
      excludedCount += 1;
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
  }

  return {
    importedCount,
    totalMatches,
    keywords: includeKeywords,
    excludedCount,
    source,
  };
}
