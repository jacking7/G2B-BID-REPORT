import Link from "next/link";
import { siteMeta } from "@/lib/site-meta";

export function LegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="legalFooter" aria-label="서비스 법적 고지">
      <div>
        <strong>{siteMeta.name}</strong>
        <span>내부 운영 콘솔 · 일반 소비자 대상 전자상거래/통신판매 기능 없음</span>
      </div>
      <nav aria-label="법적 고지 및 문의">
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/terms">이용 고지</Link>
        <a href={`${siteMeta.githubUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
          {siteMeta.license}
        </a>
        <a href={siteMeta.githubUrl} target="_blank" rel="noreferrer">
          GitHub 문의
        </a>
      </nav>
      <p>
        © {year} {siteMeta.name} contributors. Contact, source, issues, and license
        information are maintained on GitHub.
      </p>
    </footer>
  );
}
