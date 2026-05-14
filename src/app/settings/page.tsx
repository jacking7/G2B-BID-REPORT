import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import {
  addKeywordAction,
  addRecipientAction,
  deleteKeywordAction,
  deleteRecipientAction,
  saveScheduleAction,
} from "@/app/actions/settings";
import { KeywordManager } from "@/components/keyword-manager";
import { LogoutButton } from "@/components/logout-button";
import { RecipientManager } from "@/components/recipient-manager";
import { ScheduleManager } from "@/components/schedule-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireUser();
  const [includeKeywords, excludeKeywords, recipients, schedule] = await Promise.all([
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
    prisma.keywordRule.findMany({
      where: {
        userId: user.id,
        active: true,
        type: "exclude",
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
    prisma.scheduleSetting.findFirst({
      where: {
        userId: user.id,
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        collectTime: true,
        sendTime: true,
        timezone: true,
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
            로그인한 사용자만 접근 가능한 기본 설정 화면입니다. 키워드와 수신자,
            스케줄을 저장한 뒤 결과 화면에서 수집 결과를 바로 확인할 수 있습니다.
          </p>
          <div className="heroActions">
            <Link href="/results" className="secondaryButton linkButton">
              결과 화면으로 이동
            </Link>
          </div>
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
            title="포함 키워드"
            description="공고명, 기관명에 이 키워드가 포함되면 수집 대상으로 봅니다."
            type="include"
            emptyMessage="등록된 포함 키워드가 없습니다."
            keywords={includeKeywords}
            addAction={addKeywordAction}
            deleteAction={deleteKeywordAction}
          />
          <KeywordManager
            title="제외 키워드"
            description="포함 키워드에 걸려도 이 키워드가 있으면 결과에서 제외합니다."
            type="exclude"
            emptyMessage="등록된 제외 키워드가 없습니다."
            keywords={excludeKeywords}
            addAction={addKeywordAction}
            deleteAction={deleteKeywordAction}
          />
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
          <h2>스케줄 설정</h2>
          <ScheduleManager schedule={schedule} saveAction={saveScheduleAction} />
          <p className="muted">현재는 사용자별 기본 수집, 발송 시간과 시간대를 저장합니다.</p>
        </article>

        <article className="card">
          <h2>운영 메모</h2>
          <ol className="list ordered">
            <li>결과 화면에서 검색어, 발송 상태, 매칭 키워드 필터 가능</li>
            <li>포함, 제외 키워드를 함께 관리 가능</li>
            <li>ENABLE_INTERNAL_SCHEDULER=true 이면 저장된 시간 기준 자동 실행</li>
          </ol>
        </article>
      </section>
    </main>
  );
}
