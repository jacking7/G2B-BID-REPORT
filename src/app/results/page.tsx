import { collectBidNoticesAction, sendBidReportAction } from "@/app/actions/bids";
import { AppShell } from "@/components/app-shell";
import { ManualActions } from "@/components/manual-actions";
import { ResultsFilterForm } from "@/components/results-filter-form";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getKoreanDateInputValue(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getKoreanDateBounds(value: string) {
  return {
    start: new Date(`${value}T00:00:00+09:00`),
    end: new Date(`${value}T23:59:59.999+09:00`),
  };
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const keyword = typeof params.keyword === "string" ? params.keyword.trim() : "";
  const today = getKoreanDateInputValue();
  const requestedFrom = typeof params.from === "string" ? params.from : "";
  const requestedTo = typeof params.to === "string" ? params.to : "";
  const from = isDateInputValue(requestedFrom) ? requestedFrom : today;
  const to = isDateInputValue(requestedTo) ? requestedTo : today;
  const fromBounds = getKoreanDateBounds(from);
  const toBounds = getKoreanDateBounds(to);

  const collectedAtFilter = {
    gte: fromBounds.start,
    lte: toBounds.end,
  };

  const resultWhere = {
    userId: user.id,
    ...(status === "pending" ? { emailedAt: null } : {}),
    ...(status === "emailed" ? { emailedAt: { not: null } } : {}),
    ...(keyword ? { matchedKeyword: { contains: keyword } } : {}),
    collectedAt: collectedAtFilter,
    ...(query
      ? {
          OR: [
            { matchedKeyword: { contains: query } },
            { bidNotice: { title: { contains: query } } },
            { bidNotice: { organization: { contains: query } } },
            { bidNotice: { bidNtceNo: { contains: query } } },
          ],
        }
      : {}),
  };

  const [results, keywordCount, excludeKeywordCount, recipientCount, pendingMailCount, mailHistories, schedule, retryableMailCount] = await Promise.all([
    prisma.collectedResult.findMany({
      where: resultWhere,
      orderBy: {
        collectedAt: "desc",
      },
      include: {
        bidNotice: true,
      },
    }),
    prisma.keywordRule.count({
      where: {
        userId: user.id,
        active: true,
        type: "include",
      },
    }),
    prisma.keywordRule.count({
      where: {
        userId: user.id,
        active: true,
        type: "exclude",
      },
    }),
    prisma.recipient.count({
      where: {
        userId: user.id,
        active: true,
      },
    }),
    prisma.collectedResult.count({
      where: {
        userId: user.id,
        emailedAt: null,
      },
    }),
    prisma.mailHistory.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        sentAt: "desc",
      },
      take: 10,
    }),
    prisma.scheduleSetting.findFirst({
      where: {
        userId: user.id,
        active: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.mailHistory.count({
      where: {
        userId: user.id,
        status: {
          in: ["failed", "skipped"],
        },
      },
    }),
  ]);

  return (
    <AppShell
      active="results"
      user={user}
      title="공고 목록"
      description="키워드 기준으로 수집된 나라장터 공고와 메일 발송 상태를 확인합니다."
      actions={
        <>
          <a href="/api/results/export" className="primaryButton linkButton">
            Excel 다운로드
          </a>
        </>
      }
    >
      <section className="metricGrid">
        <article className="metricTile">
          <span>현재 필터 결과</span>
          <strong>{results.length}</strong>
        </article>
        <article className="metricTile">
          <span>미발송</span>
          <strong>{pendingMailCount}</strong>
        </article>
        <article className="metricTile">
          <span>활성 수신자</span>
          <strong>{recipientCount}</strong>
        </article>
        <article className="metricTile">
          <span>포함/제외 키워드</span>
          <strong>
            {keywordCount}/{excludeKeywordCount}
          </strong>
        </article>
      </section>

      <section className="consoleGrid two">
        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>수동 작업</h2>
              <p>수집 실행 후 미발송 결과를 Excel 첨부 메일로 보냅니다.</p>
            </div>
          </div>
          <ManualActions
            collectAction={collectBidNoticesAction}
            sendAction={sendBidReportAction}
          />
          {pendingMailCount > 0 && retryableMailCount > 0 ? (
            <p className="muted compactMuted">
              이전 발송 실패·건너뜀 이력 {retryableMailCount}건이 있습니다. 미발송 {pendingMailCount}건은 위
              발송 버튼으로 다시 보낼 수 있습니다.
            </p>
          ) : null}
        </article>

        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>자동 실행 상태</h2>
              <p>저장된 사용자별 수집/발송 시간을 표시합니다.</p>
            </div>
          </div>
          <ul className="list">
            <li>내부 스케줄러: {process.env.ENABLE_INTERNAL_SCHEDULER === "true" ? "활성" : "비활성"}</li>
            <li>수집 시간: {schedule?.collectTime ?? "미설정"}</li>
            <li>발송 시간: {schedule?.sendTime ?? "미설정"}</li>
            <li>시간대: {schedule?.timezone ?? "미설정"}</li>
            <li>메일 재시도 가능 이력 수: {retryableMailCount}건</li>
          </ul>
        </article>
      </section>

      <section className="consolePanel">
        <div className="panelHeader">
          <div>
            <h2>결과 필터</h2>
            <p>기본값은 KST 오늘 기준입니다. 시작일과 종료일을 바꾸면 원하는 날짜 범위로 조회합니다.</p>
          </div>
        </div>
        <ResultsFilterForm
          initialQuery={query}
          initialStatus={status}
          initialKeyword={keyword}
          initialFrom={from}
          initialTo={to}
          today={today}
        />
      </section>

      <section className="consolePanel resultsCard">
        <div className="panelHeader">
          <div>
            <h2>공고 목록</h2>
            <p>최신 수집 순으로 표시합니다.</p>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="tableWrap">
            <table className="resultsTable">
              <thead>
                <tr>
                  <th>수집시각</th>
                  <th>발송상태</th>
                  <th>매칭 키워드</th>
                  <th>공고명</th>
                  <th>기관</th>
                  <th>공고일</th>
                  <th>마감일</th>
                  <th>기초금액</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>{formatDateTime(result.collectedAt)}</td>
                    <td>{result.emailedAt ? "발송완료" : "미발송"}</td>
                    <td>{result.matchedKeyword ?? "-"}</td>
                    <td>
                      {result.bidNotice.detailUrl ? (
                        <a href={result.bidNotice.detailUrl} target="_blank" rel="noreferrer">
                          {result.bidNotice.title}
                        </a>
                      ) : (
                        result.bidNotice.title
                      )}
                    </td>
                    <td>{result.bidNotice.organization ?? "-"}</td>
                    <td>{formatDateTime(result.bidNotice.noticeDate)}</td>
                    <td>{formatDateTime(result.bidNotice.closeDate)}</td>
                    <td>{formatCurrency(result.bidNotice.baseAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">아직 수집된 공고가 없습니다. 먼저 키워드를 등록하고 수집을 실행해주세요.</p>
        )}
      </section>

      <section className="consolePanel resultsCard">
        <div className="panelHeader">
          <div>
            <h2>메일 발송 이력</h2>
            <p>최근 10건을 표시합니다.</p>
          </div>
        </div>

        {mailHistories.length > 0 ? (
          <div className="tableWrap">
            <table className="resultsTable">
              <thead>
                <tr>
                  <th>발송시각</th>
                  <th>수신자</th>
                  <th>제목</th>
                  <th>상태</th>
                  <th>오류</th>
                </tr>
              </thead>
              <tbody>
                {mailHistories.map((history) => (
                  <tr key={history.id}>
                    <td>{formatDateTime(history.sentAt)}</td>
                    <td>{history.recipient}</td>
                    <td>{history.subject}</td>
                    <td>{history.status}</td>
                    <td>{history.errorMessage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">아직 메일 발송 이력이 없습니다.</p>
        )}
      </section>
    </AppShell>
  );
}
