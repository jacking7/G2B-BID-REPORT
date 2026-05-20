import { sendBidReportAction } from "@/app/actions/bids";
import { updateScheduleActiveAction } from "@/app/actions/settings";
import { AppShell } from "@/components/app-shell";
import { ManualActions } from "@/components/manual-actions";
import { ResultsFilterForm } from "@/components/results-filter-form";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { expandKeywordValues } from "@/lib/keywords";
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

function getResultsReturnPath(params: Record<string, string | string[] | undefined>) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "keyword", "from", "to"]) {
    const value = params[key];
    if (typeof value === "string" && value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/results?${queryString}` : "/results";
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

  const [
    results,
    keywordRules,
    recipients,
    pendingMailCount,
    mailHistories,
    schedule,
    retryableMailCount,
  ] = await Promise.all([
    prisma.collectedResult.findMany({
      where: resultWhere,
      orderBy: {
        collectedAt: "desc",
      },
      include: {
        bidNotice: true,
      },
    }),
    prisma.keywordRule.findMany({
      where: {
        userId: user.id,
        active: true,
      },
      select: {
        keyword: true,
        type: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.recipient.findMany({
      where: {
        userId: user.id,
        active: true,
      },
      select: {
        name: true,
        email: true,
      },
      orderBy: {
        createdAt: "asc",
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
  const includeKeywords = expandKeywordValues(
    keywordRules.filter((rule) => rule.type === "include").map((rule) => rule.keyword),
  );
  const excludeKeywords = expandKeywordValues(
    keywordRules.filter((rule) => rule.type === "exclude").map((rule) => rule.keyword),
  );
  const internalSchedulerEnabled = process.env.ENABLE_INTERNAL_SCHEDULER === "true";
  const userScheduleEnabled = schedule?.active ?? false;
  const automationEnabled = internalSchedulerEnabled && userScheduleEnabled;
  const automationStatusNote = !internalSchedulerEnabled
    ? "서버 OFF"
    : userScheduleEnabled
      ? "자동 실행"
      : "사용자 OFF";
  const resultsReturnPath = getResultsReturnPath(params);

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
          <strong>{recipients.length}</strong>
        </article>
        <article className="metricTile">
          <span>포함/제외 키워드</span>
          <strong>
            {includeKeywords.length}/{excludeKeywords.length}
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
          <ManualActions sendAction={sendBidReportAction} />
          <div className="settingsSnapshot">
            <div className="snapshotGroup">
              <strong>포함 키워드</strong>
              <div className="chipList">
                {includeKeywords.length > 0 ? (
                  includeKeywords.map((item) => <span key={`include-${item}`}>{item}</span>)
                ) : (
                  <em>없음</em>
                )}
              </div>
            </div>
            <div className="snapshotGroup">
              <strong>제외 키워드</strong>
              <div className="chipList">
                {excludeKeywords.length > 0 ? (
                  excludeKeywords.map((item) => <span key={`exclude-${item}`}>{item}</span>)
                ) : (
                  <em>없음</em>
                )}
              </div>
            </div>
            <div className="snapshotGroup">
              <strong>수신자</strong>
              <div className="chipList">
                {recipients.length > 0 ? (
                  recipients.map((item) => (
                    <span key={item.email}>{item.name ? `${item.name} · ${item.email}` : item.email}</span>
                  ))
                ) : (
                  <em>없음</em>
                )}
              </div>
            </div>
          </div>
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
              <p>사용자 설정과 서버 스케줄러 상태를 분리해서 표시합니다.</p>
            </div>
          </div>
          <div className="automationStatusBoard">
            <div className={automationEnabled ? "statusDial active" : "statusDial"}>
              <span />
              <strong>{automationEnabled ? "활성" : "비활성"}</strong>
              <small>{automationStatusNote}</small>
            </div>
            <div className="automationTimeline">
              <div className="automationControlTile">
                <span>사용자 설정</span>
                <div className="automationToggleActions">
                  <form action={updateScheduleActiveAction} className="automationModeForm">
                    <input type="hidden" name="active" value="true" />
                    <input type="hidden" name="returnTo" value={resultsReturnPath} />
                    <button
                      type="submit"
                      className={userScheduleEnabled ? "statusOption active" : "statusOption"}
                      disabled={userScheduleEnabled}
                    >
                      활성
                    </button>
                  </form>
                  <form action={updateScheduleActiveAction} className="automationModeForm">
                    <input type="hidden" name="active" value="false" />
                    <input type="hidden" name="returnTo" value={resultsReturnPath} />
                    <button
                      type="submit"
                      className={userScheduleEnabled ? "statusOption" : "statusOption danger active"}
                      disabled={!userScheduleEnabled}
                    >
                      비활성
                    </button>
                  </form>
                </div>
              </div>
              <div>
                <span>서버 스케줄러</span>
                <strong>{internalSchedulerEnabled ? "ON" : "OFF"}</strong>
              </div>
              <div>
                <span>수집</span>
                <strong>{schedule?.collectTime ?? "--:--"}</strong>
              </div>
              <div>
                <span>발송</span>
                <strong>{schedule?.sendTime ?? "--:--"}</strong>
              </div>
              <div>
                <span>시간대</span>
                <strong>{schedule?.timezone ?? "미설정"}</strong>
              </div>
              <div>
                <span>재시도</span>
                <strong>{retryableMailCount}건</strong>
              </div>
            </div>
          </div>
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
