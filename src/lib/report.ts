import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, getTodayDateLabel } from "@/lib/format";

export async function getCollectedResultsForUser(userId: string) {
  return prisma.collectedResult.findMany({
    where: {
      userId,
    },
    orderBy: {
      collectedAt: "desc",
    },
    include: {
      bidNotice: true,
    },
  });
}

export async function getPendingResultsForUser(userId: string) {
  return prisma.collectedResult.findMany({
    where: {
      userId,
      emailedAt: null,
    },
    orderBy: {
      collectedAt: "desc",
    },
    include: {
      bidNotice: true,
    },
  });
}

type CollectedResultWithNotice = Awaited<ReturnType<typeof getCollectedResultsForUser>>[number];

function buildWorkbookFromResults(results: CollectedResultWithNotice[]) {
  const rows = results.map((result) => ({
    수집시각: formatDateTime(result.collectedAt),
    발송상태: result.emailedAt ? "발송완료" : "미발송",
    매칭키워드: result.matchedKeyword ?? "-",
    공고번호: result.bidNotice.bidNtceNo,
    공고차수: result.bidNotice.bidNtceOrd ?? "-",
    공고명: result.bidNotice.title,
    기관: result.bidNotice.organization ?? "-",
    공고일: formatDateTime(result.bidNotice.noticeDate),
    마감일: formatDateTime(result.bidNotice.closeDate),
    기초금액: formatCurrency(result.bidNotice.baseAmount),
    상세URL: result.bidNotice.detailUrl ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 안내: "수집 결과가 없습니다." }]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "수집결과");

  return {
    buffer: XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer,
    fileName: `g2b-results-${getTodayDateLabel()}.xlsx`,
    count: results.length,
  };
}

export function buildResultsWorkbookFromResults(results: CollectedResultWithNotice[]) {
  return buildWorkbookFromResults(results);
}

export async function buildResultsWorkbook(userId: string) {
  const results = await getCollectedResultsForUser(userId);
  return buildWorkbookFromResults(results);
}

export function buildReportHtml(input: {
  userName: string;
  results: Awaited<ReturnType<typeof getPendingResultsForUser>>;
}) {
  const { userName, results } = input;
  const rows = results
    .map(
      (result) => `
        <tr>
          <td style="padding:8px;border:1px solid #d7e0ea;">${result.matchedKeyword ?? "-"}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${result.bidNotice.title}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${result.bidNotice.organization ?? "-"}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${formatDateTime(result.bidNotice.noticeDate)}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${formatDateTime(result.bidNotice.closeDate)}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${formatCurrency(result.bidNotice.baseAmount)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6;">
      <h2>나라장터 신규 공고 리포트</h2>
      <p>${userName}님 기준 신규 수집 공고 ${results.length}건입니다.</p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">매칭 키워드</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">공고명</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">기관</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">공고일</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">마감일</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">기초금액</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
