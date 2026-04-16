import { logoutAction } from "@/app/actions/auth";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth";

const keywordSamples = ["AI", "인공지능", "구축", "플랫폼"];
const recipientSamples = ["bca@sunyoutech.com"];

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="shell">
      <section className="hero settingsHero">
        <div>
          <span className="eyebrow">SETTINGS</span>
          <h1>운영 설정 초안</h1>
          <p className="heroText">
            로그인한 사용자만 접근 가능한 기본 설정 화면입니다. 다음 단계에서는
            실제 저장 기능과 CRUD를 붙이면 됩니다.
          </p>
        </div>
        <div className="settingsHeroSide">
          <p className="cardLabel">현재 로그인</p>
          <strong>{user.name ?? user.email}</strong>
          <span className="muted">권한: {user.role}</span>
          <LogoutButton action={logoutAction} />
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>기본 키워드</h2>
          <ul className="list">
            {keywordSamples.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
          <p className="muted">다음 단계에서 DB와 연결해 추가, 수정, 비활성화를 지원합니다.</p>
        </article>

        <article className="card">
          <h2>기본 수신자</h2>
          <ul className="list">
            {recipientSamples.map((recipient) => (
              <li key={recipient}>{recipient}</li>
            ))}
          </ul>
          <p className="muted">수신자별 활성화 여부와 이름 필드를 함께 관리할 예정입니다.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>스케줄 초안</h2>
          <ul className="list">
            <li>수집 시간: 매일 18:00</li>
            <li>메일 발송: 매일 09:00</li>
            <li>시간대: Asia/Seoul</li>
          </ul>
        </article>

        <article className="card">
          <h2>다음 연결 작업</h2>
          <ol className="list ordered">
            <li>키워드, 수신자, 스케줄 CRUD API</li>
            <li>설정 저장 폼과 서버 액션 연결</li>
            <li>나라장터 수집기와 결과 화면 연동</li>
          </ol>
        </article>
      </section>
    </main>
  );
}
