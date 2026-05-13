import Link from "next/link";
import { collectBidNoticesAction } from "@/app/actions/bids";
import { CollectBidsButton } from "@/components/collect-bids-button";
import { LogoutButton } from "@/components/logout-button";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatCurrency(value: number | null) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export default async function ResultsPage() {
  const user = await requireUser();

  const [results, keywordCount] = await Promise.all([
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
  ]);

  return (
    <main className="shell">
      <section className="hero settingsHero">
        <div>
          <span className="eyebrow">RESULTS</span>
          <h1>수집 결과</h1>
          <p className="heroText">
            현재는 저장된 샘플 공고를 기준으로 사용자 키워드 매칭 결과를 확인할 수 있습니다.
            다음 단계에서 실제 나라장터 API 또는 수집 스크립트와 연결하면 됩니다.
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
          <h2>수동 수집</h2>
          <p className="muted">
            샘플 데이터 기준으로 키워드 매칭을 실행합니다. 중복 공고는 다시 저장하지 않습니다.
          </p>
          <CollectBidsButton action={collectBidNoticesAction} />
        </article>

        <article className="card">
          <h2>현재 상태</h2>
          <ul className="list">
            <li>저장된 결과 수: {results.length}건</li>
            <li>사용자별 키워드 매칭 결과 분리 저장</li>
            <li>다음 단계: 실제 수집기 연결, 엑셀 다운로드, 메일 발송</li>
          </ul>
        </article>
      </section>

      <section className="card resultsCard">
        <div className="resultsHeader">
          <div>
            <h2>공고 목록</h2>
            <p className="muted compactMuted">최신 수집 순으로 표시합니다.</p>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="tableWrap">
            <table className="resultsTable">
              <thead>
                <tr>
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
                    <td>{formatDate(result.bidNotice.noticeDate)}</td>
                    <td>{formatDate(result.bidNotice.closeDate)}</td>
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
    </main>
  );
}
