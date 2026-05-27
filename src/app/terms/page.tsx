import { LegalFooter } from "@/components/legal-footer";
import { siteMeta } from "@/lib/site-meta";

const notices = [
  {
    title: "서비스 성격",
    body: "본 서비스는 승인된 운영자를 위한 나라장터 입찰공고 내부 운영 콘솔입니다. 일반 소비자를 대상으로 한 회원가입, 결제, 재화·용역 청약, 통신판매 기능을 제공하지 않습니다.",
  },
  {
    title: "문의 및 고지 경로",
    body: `서비스 문의, 오류 제보, 소스 확인, 변경 이력, 라이선스 관련 사항은 GitHub 저장소(${siteMeta.githubUrl})에서 확인합니다.`,
  },
  {
    title: "라이선스",
    body: `소스코드는 ${siteMeta.license}로 제공됩니다. 라이선스 전문은 GitHub 저장소의 LICENSE 파일을 기준으로 합니다.`,
  },
  {
    title: "책임 제한",
    body: "수집 결과와 발송 리포트는 운영 편의를 위한 보조 정보입니다. 입찰 참여 여부, 제출 기한, 공고 원문, 자격 요건은 반드시 나라장터 원문에서 최종 확인해야 합니다.",
  },
  {
    title: "운영 정책",
    body: "계정 추가, 권한 변경, 비밀번호 재설정, 메일 수신자 변경은 승인된 운영 절차에 따라 처리합니다. 비인가 접근과 외부 계정 수집은 허용하지 않습니다.",
  },
];

export default function TermsPage() {
  return (
    <main className="legalPageShell">
      <section className="legalPageHeader">
        <span className="eyebrow">NOTICE</span>
        <h1>이용 고지</h1>
        <p>
          {siteMeta.name}의 서비스 성격, 문의 경로, 라이선스, 책임 범위를 한 곳에서
          확인할 수 있도록 정리했습니다.
        </p>
      </section>

      <section className="legalPanel" aria-label="이용 고지 본문">
        {notices.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <LegalFooter />
    </main>
  );
}
