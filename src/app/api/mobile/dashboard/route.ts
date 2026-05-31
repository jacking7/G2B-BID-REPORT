import { requireMobileApiUser } from "@/app/api/mobile/_auth";
import { expandKeywordValues } from "@/lib/keywords";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dashboardResultLimit = 10;

function getKoreanDateInputValue(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getKoreanDateBounds(value: string) {
  return {
    start: new Date(`${value}T00:00:00+09:00`),
    end: new Date(`${value}T23:59:59.999+09:00`),
  };
}

export async function GET(request: Request) {
  const auth = await requireMobileApiUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const userId = auth.user.id;
  const today = getKoreanDateInputValue();
  const todayBounds = getKoreanDateBounds(today);

  const [
    pendingMailCount,
    todayCollectionCount,
    keywordRules,
    recipients,
    schedule,
    results,
  ] = await Promise.all([
    prisma.collectedResult.count({
      where: {
        userId,
        emailedAt: null,
      },
    }),
    prisma.collectedResult.count({
      where: {
        userId,
        collectedAt: {
          gte: todayBounds.start,
          lte: todayBounds.end,
        },
      },
    }),
    prisma.keywordRule.findMany({
      where: {
        userId,
        active: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        keyword: true,
        type: true,
      },
    }),
    prisma.recipient.findMany({
      where: {
        userId,
        active: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    }),
    prisma.scheduleSetting.findFirst({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        collectTime: true,
        sendTime: true,
        timezone: true,
        active: true,
      },
    }),
    prisma.collectedResult.findMany({
      where: {
        userId,
      },
      orderBy: {
        collectedAt: "desc",
      },
      take: dashboardResultLimit,
      include: {
        bidNotice: true,
      },
    }),
  ]);

  const includeKeywords = expandKeywordValues(
    keywordRules.filter((rule) => rule.type === "include").map((rule) => rule.keyword),
  );
  const excludeKeywords = expandKeywordValues(
    keywordRules.filter((rule) => rule.type === "exclude").map((rule) => rule.keyword),
  );

  return Response.json({
    user: auth.user,
    metrics: [
      {
        key: "pendingMail",
        label: "미발송",
        value: pendingMailCount,
        helper: "메일 발송 대기",
      },
      {
        key: "todayConfirmed",
        label: "오늘 확인",
        value: todayCollectionCount,
        helper: "새 저장+다시 표시",
      },
      {
        key: "activeRecipients",
        label: "활성 수신자",
        value: recipients.length,
      },
      {
        key: "keywordRules",
        label: "포함/제외",
        value: `${includeKeywords.length}/${excludeKeywords.length}`,
        helper: "키워드",
      },
    ],
    results: results.map((result) => ({
      id: result.id,
      bidNtceNo: result.bidNotice.bidNtceNo,
      title: result.bidNotice.title,
      organization: result.bidNotice.organization,
      matchedKeyword: result.matchedKeyword,
      collectedAt: result.collectedAt.toISOString(),
      confirmedAt: result.collectedAt.toISOString(),
      emailedAt: result.emailedAt?.toISOString() ?? null,
      closeDate: result.bidNotice.closeDate?.toISOString() ?? null,
      detailUrl: result.bidNotice.detailUrl,
    })),
    collectionPolicy: {
      resultTimeLabel: "확인시각",
      todayMetricKey: "todayConfirmed",
      repeatMatchedResultsRefresh: true,
      repeatMatchedResultsResendMail: false,
    },
    settings: {
      includeKeywords,
      excludeKeywords,
      recipients,
      schedule,
    },
    serverTime: new Date().toISOString(),
  });
}
