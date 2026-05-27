import { LegalFooter } from "@/components/legal-footer";
import { siteMeta } from "@/lib/site-meta";

const policyItems = [
  {
    title: "처리 목적",
    body: "운영자 인증, 사용자별 키워드 설정, 나라장터 공고 수집 결과 관리, Excel 리포트 생성, 메일 발송 이력 관리, 보안 감사 및 장애 대응에 사용합니다.",
  },
  {
    title: "처리 항목",
    body: "운영자 이름, 이메일, 비밀번호 해시, 수신자 이름과 이메일, 키워드 설정, 공고 수집 결과, 메일 발송 이력, 세션 쿠키 및 접속 과정에서 생성되는 최소한의 기술 정보를 처리할 수 있습니다.",
  },
  {
    title: "보유 기간",
    body: "계정과 운영 설정은 계정 삭제 또는 서비스 운영 종료 시까지 보유합니다. 메일 이력과 공고 처리 기록은 업무 확인과 장애 대응에 필요한 기간 동안 보유한 뒤 삭제합니다.",
  },
  {
    title: "제3자 제공",
    body: "법령상 의무가 있거나 사용자가 별도로 동의한 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 메일 발송 과정에서는 설정된 SMTP 제공자에 발송에 필요한 정보가 전송될 수 있습니다.",
  },
  {
    title: "처리 위탁 및 외부 서비스",
    body: "소스와 문의는 GitHub에서 관리합니다. 운영 환경에 따라 AWS, Duck DNS, Gmail SMTP 등 인프라 서비스가 사용될 수 있으며, 각 서비스는 접속·전송 처리 과정에 필요한 범위에서만 이용됩니다.",
  },
  {
    title: "정보주체 권리",
    body: "개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 운영자 계정 및 수신자 정보 변경은 서비스 관리자 또는 GitHub 이슈를 통해 요청합니다.",
  },
  {
    title: "안전성 확보 조치",
    body: "HTTPS, 인증 쿠키, 비밀번호 해시 저장, 내부 운영자 제한, 보안 헤더, 서버 접근 제한 등 현재 서비스 규모에 맞는 보호 조치를 적용합니다.",
  },
  {
    title: "문의",
    body: `개인정보 및 서비스 관련 문의는 GitHub 저장소(${siteMeta.githubUrl})의 Issues 또는 저장소 연락 경로를 사용합니다.`,
  },
];

export default function PrivacyPage() {
  return (
    <main className="legalPageShell">
      <section className="legalPageHeader">
        <span className="eyebrow">PRIVACY</span>
        <h1>개인정보처리방침</h1>
        <p>
          {siteMeta.name}은 내부 운영 콘솔에서 필요한 최소한의 개인정보만 처리하며,
          관련 문의와 변경 이력은 GitHub 저장소를 기준으로 관리합니다.
        </p>
      </section>

      <section className="legalPanel" aria-label="개인정보처리방침 본문">
        {policyItems.map((item) => (
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
