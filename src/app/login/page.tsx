import { redirect } from "next/navigation";
import {
  loginAction,
  registerAction,
  requestAccountLookupAction,
  requestEmailVerificationAction,
  requestPasswordResetAction,
} from "@/app/actions/auth";
import { AuthAccessPanel } from "@/components/auth-access-panel";
import { LegalFooter } from "@/components/legal-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/settings");
  }

  const params = (await searchParams) ?? {};
  const oauthError =
    typeof params.oauthError === "string" ? params.oauthError : undefined;
  const userCount = await prisma.user.count();
  const needsFirstAdmin = userCount === 0;

  return (
    <main className="productLoginShell">
      <section className="productLoginFrame" aria-label="G2B Bid Report 로그인">
        <div className="productLoginIntro">
          <div className="productBrandLine">
            <span className="brandMark">G2B</span>
            <div>
              <strong>G2B Bid Report</strong>
              <span>입찰공고 운영 콘솔</span>
            </div>
          </div>

          <div>
            <span className="eyebrow">G2B BID REPORT</span>
            <h1>나라장터 입찰공고 리포트</h1>
            <p>
              키워드 기반 공고 수집, 결과 확인, Excel 다운로드, 메일 발송을 한 곳에서 관리합니다.
            </p>
          </div>

          <ul className="productLoginMeta" aria-label="제품 주요 기능">
            <li>
              <strong>가입과 인증</strong>
              <span>이메일 인증, 소셜 로그인, 비밀번호 복구 지원</span>
            </li>
            <li>
              <strong>자동 로그인</strong>
              <span>세션 쿠키로 다음 접속 때 로그인 상태 자동 확인</span>
            </li>
            <li>
              <strong>운영 콘솔</strong>
              <span>수집, 결과, Excel, 메일 리포트를 한 화면에서 관리</span>
            </li>
          </ul>
        </div>

        <div className="productLoginContent">
          <div className="loginUtilityRow">
            <ThemeToggle />
          </div>

          <AuthAccessPanel
            loginAction={loginAction}
            registerAction={registerAction}
            requestEmailVerificationAction={requestEmailVerificationAction}
            requestPasswordResetAction={requestPasswordResetAction}
            requestAccountLookupAction={requestAccountLookupAction}
            needsFirstAdmin={needsFirstAdmin}
            oauthError={oauthError}
          />
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}
