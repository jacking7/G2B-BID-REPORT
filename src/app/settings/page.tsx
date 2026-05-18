import {
  addKeywordAction,
  addRecipientAction,
  deleteKeywordAction,
  deleteRecipientAction,
  saveScheduleAction,
} from "@/app/actions/settings";
import { AppShell } from "@/components/app-shell";
import { KeywordManager } from "@/components/keyword-manager";
import { RecipientManager } from "@/components/recipient-manager";
import { ScheduleManager } from "@/components/schedule-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    <AppShell
      active="settings"
      user={user}
      title="운영 설정"
      description="키워드, 수신자, 스케줄을 한 화면에서 관리합니다."
    >
      <section className="consoleGrid two">
        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>키워드 관리</h2>
              <p>포함/제외 규칙은 저장 즉시 다음 수집에 반영됩니다.</p>
            </div>
          </div>
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

        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>수신자 관리</h2>
              <p>메일 리포트를 받을 활성 수신자를 관리합니다.</p>
            </div>
          </div>
          <RecipientManager
            recipients={recipients}
            addAction={addRecipientAction}
            deleteAction={deleteRecipientAction}
          />
        </article>
      </section>

      <section className="consoleGrid">
        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>스케줄 설정</h2>
              <p>한국 시간 기준 기본 수집/발송 시간을 저장합니다.</p>
            </div>
          </div>
          <ScheduleManager schedule={schedule} saveAction={saveScheduleAction} />
        </article>
      </section>
    </AppShell>
  );
}
