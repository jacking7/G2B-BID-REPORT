const overviewCards = [
  {
    title: "수집 일정",
    value: "매일 18:00",
    description: "나라장터 공고를 키워드 기준으로 수집합니다.",
  },
  {
    title: "메일 발송",
    value: "매일 09:00",
    description: "전일 신규 공고를 요약해 수신자에게 보냅니다.",
  },
  {
    title: "기본 키워드",
    value: "AI, 인공지능, 구축, 플랫폼",
    description: "관리 화면에서 포함/제외 키워드를 조정할 수 있습니다.",
  },
];

const nextSteps = [
  "실제 나라장터 수집 API 또는 스크래퍼 연결",
  "엑셀 다운로드와 메일 발송 기능 추가",
  "설정 화면 고도화와 제외 키워드 지원",
  "자동 스케줄러 연결 및 운영 배치 구성",
];

import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">G2B BID REPORT</span>
        <h1>나라장터 입찰공고 자동 수집·리포트 서비스</h1>
        <p className="heroText">
          키워드 기반 신규 공고를 수집하고, 결과를 웹 화면과 이메일로 정리해 주는
          내부 업무용 대시보드 초안입니다.
        </p>
        <div className="heroActions">
          <Link href="/login" className="primaryButton linkButton">
            로그인 시작
          </Link>
          <Link href="/settings" className="secondaryButton linkButton">
            설정 화면 보기
          </Link>
          <Link href="/results" className="ghostButton linkButton">
            결과 화면 보기
          </Link>
        </div>
      </section>

      <section className="grid three">
        {overviewCards.map((card) => (
          <article key={card.title} className="card statCard">
            <p className="cardLabel">{card.title}</p>
            <h2>{card.value}</h2>
            <p className="muted">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card">
          <h2>핵심 기능 범위</h2>
          <ul className="list">
            <li>다중 사용자 로그인</li>
            <li>키워드, 수신자, 스케줄 관리</li>
            <li>신규 공고 저장 및 결과 조회</li>
            <li>엑셀 다운로드 및 메일 발송</li>
          </ul>
        </article>

        <article className="card">
          <h2>다음 작업</h2>
          <ol className="list ordered">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="muted">
            현재 DB 초기화와 연결 확인 API는 준비되었습니다. 상태 확인은
            <code className="inlineCode"> /api/health </code>에서 가능합니다.
          </p>
        </article>
      </section>
    </main>
  );
}
