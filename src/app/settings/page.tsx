import { logoutAction } from "@/app/actions/auth";
import {
  addKeywordAction,
  addRecipientAction,
  deleteKeywordAction,
  deleteRecipientAction,
} from "@/app/actions/settings";
import { KeywordManager } from "@/components/keyword-manager";
import { LogoutButton } from "@/components/logout-button";
import { RecipientManager } from "@/components/recipient-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireUser();
  const [keywords, recipients] = await Promise.all([
    prisma.keywordRule.findMany({
      where: {
        userId: user.id,
        active: true,
        type: "include",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        keyword: true,
      },
    }),
    prisma.recipient.findMany({
      where: {
        userId: user.id,
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
  ]);

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
          <h2>키워드 관리</h2>
          <KeywordManager
            keywords={keywords}
            addAction={addKeywordAction}
            deleteAction={deleteKeywordAction}
          />
          <p className="muted">현재는 포함 키워드의 추가, 삭제만 우선 지원합니다.</p>
        </article>

        <article className="card">
          <h2>수신자 관리</h2>
          <RecipientManager
            recipients={recipients}
            addAction={addRecipientAction}
            deleteAction={deleteRecipientAction}
          />
          <p className="muted">현재는 활성 수신자의 추가, 삭제만 우선 지원합니다.</p>
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
