import Link from "next/link";
import { collectBidNoticesAction, sendBidReportAction } from "@/app/actions/bids";
import { CollectBidsButton } from "@/components/collect-bids-button";
import { LogoutButton } from "@/components/logout-button";
import { SendReportButton } from "@/components/send-report-button";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ResultsPage() {
  const user = await requireUser();

  const [results, keywordCount, recipientCount, pendingMailCount, mailHistories] = await Promise.all([
    prisma.collectedResult.findMany({
      where: {
        userId: user.id,
      },
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
  ]);

  return (
    <main className="shell">
      <section className="hero settingsHero">
        <div>
          <span className="eyebrow">RESULTS</span>
          <h1>수집 결과</h1>
          <p className="heroText">
            사용자 키워드를 기준으로 공고를 수집하고 저장된 결과를 확인합니다.
            현재는 g2bplus 공개 화면 스크래핑을 우선 연결했고, 실패 시에만 샘플 데이터로 대체합니다.
          </p>
          <div className="heroActions">
            <Link href="/settings" className="secondaryButton linkButton">
              설정으로 이동
            </Link>
            <Link href="/" className="ghostButton linkButton">
              홈으로 이동
            </Link>
          </div>
        </div>

        <div className="settingsHeroSide">
          <p className="cardLabel">현재 로그인</p>
          <strong>{user.name ?? user.email}</strong>
          <span className="muted compactMuted">활성 키워드 {keywordCount}개</span>
          <LogoutButton action={logoutAction} />
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>수동 작업</h2>
          <p className="muted">
            실제 수집을 먼저 시도하고, 실행 불가할 때만 샘플 데이터로 대체합니다. 메일은 아직 미발송 결과만 첨부 Excel과 함께 보냅니다.
          </p>
          <CollectBidsButton action={collectBidNoticesAction} />
          <SendReportButton action={sendBidReportAction} />
          <div className="heroActions compactActions">
            <a href="/api/results/export" className="ghostButton linkButton">
              Excel 다운로드
            </a>
          </div>
        </article>

        <article className="card">
          <h2>현재 상태</h2>
          <ul className="list">
            <li>저장된 결과 수: {results.length}건</li>
            <li>미발송 결과 수: {pendingMailCount}건</li>
            <li>활성 수신자 수: {recipientCount}명</li>
            <li>사용자별 키워드 매칭 결과 분리 저장</li>
          </ul>
        </article>
      </section>

      <section className="card resultsCard">
        <div className="resultsHeader">
          <div>
            <h2>공고 목록</h2>
            <p className="muted compactMuted">최신 수집 순으로 표시합니다.</p>
          </div>
          <a href="/api/results/export" className="secondaryButton linkButton">
            Excel 다운로드
          </a>
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

      <section className="card resultsCard">
        <div className="resultsHeader">
          <div>
            <h2>메일 발송 이력</h2>
            <p className="muted compactMuted">최근 10건을 표시합니다.</p>
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
    </main>
  );
}
