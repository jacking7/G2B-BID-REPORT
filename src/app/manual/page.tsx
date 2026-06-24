import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const setupSteps = [
  {
    title: "포함 키워드 등록",
    body: "설정에서 공고명, 품명, 사업명, 기관명 기준 키워드를 등록합니다. 포함 키워드가 없으면 수집을 실행할 수 없습니다.",
  },
  {
    title: "제외 키워드 정리",
    body: "불필요한 공고를 줄이기 위해 제외 키워드를 추가합니다. 포함 키워드에 걸려도 제외 키워드가 있으면 결과에서 제외됩니다.",
  },
  {
    title: "수신자 추가",
    body: "메일 리포트를 받을 이름과 이메일을 등록합니다. 활성 수신자가 있어야 일일 리포트 메일을 보낼 수 있습니다.",
  },
  {
    title: "스케줄 저장",
    body: "한국 시간 기준 수집 시간, 발송 시간, 수집 대상, 수집 기준을 저장하고 자동 실행을 켭니다. 서버 스케줄러가 켜져 있어야 자동화가 동작합니다.",
  },
];

const operationSteps = [
  {
    title: "실제 수집 실행",
    body: "공고 목록의 수동 작업에서 수집을 시작합니다. 진행률, 조회 건수, 일치 건수, 새 저장 건수, 다시 표시 건수를 확인합니다.",
  },
  {
    title: "필터로 결과 확인",
    body: "날짜, 키워드, 메일 상태, 검색어로 결과를 좁혀 봅니다. 기본 조회일은 한국 시간 기준 오늘이며, 다시 조건에 맞은 기존 공고도 오늘 목록에 표시됩니다.",
  },
  {
    title: "Excel 다운로드",
    body: "현재 수집 결과를 업무 공유용 Excel 파일로 내려받습니다. 카테고리별 시트로 나뉘며 필터와 무관하게 서버가 제공하는 최신 결과 기준으로 생성됩니다.",
  },
  {
    title: "일일 리포트 메일 발송",
    body: "설정된 발송 시간 기준 직전 하루 동안 확인된 결과를 Excel 첨부 메일로 보냅니다. 이미 발송된 공고도 다시 조건에 맞아 확인되면 해당 일일 리포트에 포함됩니다.",
  },
];

const statusNotes = [
  {
    term: "자동 실행",
    description: "사용자 스케줄과 서버 내부 스케줄러가 모두 켜진 상태입니다.",
  },
  {
    term: "사용자 OFF",
    description: "설정 화면에서 자동 실행이 꺼져 있어 저장된 시간에 작업하지 않습니다.",
  },
  {
    term: "서버 OFF",
    description: "운영 서버의 내부 스케줄러가 꺼져 있습니다. 수동 수집과 수동 발송은 계속 사용할 수 있습니다.",
  },
  {
    term: "일일 리포트 대상 0건",
    description: "설정된 발송 시간 기준 직전 하루 동안 확인된 결과가 없다는 뜻입니다. 새 수집을 실행한 뒤 다시 확인합니다.",
  },
];

export default async function ManualPage() {
  const user = await requireUser();

  return (
    <AppShell
      active="manual"
      user={user}
      title="사용 매뉴얼"
      description="나라장터 입찰공고, 사전규격, 발주계획 수집부터 Excel 다운로드와 메일 발송까지 운영 흐름을 확인합니다."
      actions={
        <>
          <Link href="/settings" className="secondaryButton linkButton">
            설정 열기
          </Link>
          <Link href="/results" className="primaryButton linkButton">
            공고 목록 열기
          </Link>
        </>
      }
    >
      <section className="consoleGrid two">
        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>처음 설정</h2>
              <p>수집 전에 키워드, 수신자, 자동 실행 조건을 먼저 맞춥니다.</p>
            </div>
          </div>
          <ol className="manualStepList">
            {setupSteps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>수집과 발송</h2>
              <p>수동 실행으로 결과를 검토한 뒤 필요한 파일과 메일을 생성합니다.</p>
            </div>
          </div>
          <ol className="manualStepList">
            {operationSteps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="consoleGrid two">
        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>상태 읽는 법</h2>
              <p>대시보드에 표시되는 상태 문구를 빠르게 판단합니다.</p>
            </div>
          </div>
          <dl className="manualStatusList">
            {statusNotes.map((note) => (
              <div key={note.term}>
                <dt>{note.term}</dt>
                <dd>{note.description}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="consolePanel">
          <div className="panelHeader">
            <div>
              <h2>운영 체크</h2>
              <p>오류가 보일 때 먼저 확인할 항목입니다.</p>
            </div>
          </div>
          <ul className="manualCheckList">
            <li>포함 키워드가 1개 이상 등록되어 있는지 확인합니다.</li>
            <li>활성 수신자 이메일이 올바른지 확인합니다.</li>
            <li>메일 발송 실패 시 운영 서버의 SMTP 환경 설정을 확인합니다.</li>
            <li>자동 실행이 안 되면 사용자 스케줄과 서버 스케줄러 상태를 함께 확인합니다.</li>
            <li>공고 원문 확인은 공고 목록의 상세 링크에서 나라장터 페이지로 이동합니다.</li>
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
