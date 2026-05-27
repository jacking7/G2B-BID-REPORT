import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { LegalFooter } from "@/components/legal-footer";
import { PasswordResetForm } from "@/components/password-reset-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="productLoginShell">
      <section className="productLoginFrame resetPasswordFrame" aria-label="비밀번호 재설정">
        <div className="productLoginIntro">
          <div className="productBrandLine">
            <span className="brandMark">G2B</span>
            <div>
              <strong>G2B Bid Report</strong>
              <span>입찰공고 운영 콘솔</span>
            </div>
          </div>

          <div>
            <span className="eyebrow">PASSWORD RESET</span>
            <h1>비밀번호 재설정</h1>
            <p>메일로 받은 재설정 링크에서 새 비밀번호를 등록합니다.</p>
          </div>

          <Link className="ghostButton linkButton" href="/login">
            로그인 화면으로
          </Link>
        </div>

        <div className="productLoginContent">
          <div className="loginUtilityRow">
            <ThemeToggle />
          </div>
          {token ? (
            <PasswordResetForm token={token} action={resetPasswordAction} />
          ) : (
            <div className="authForm">
              <div className="authHeader">
                <h2>링크가 올바르지 않습니다</h2>
                <p>로그인 화면에서 비밀번호 찾기를 다시 요청해주세요.</p>
              </div>
              <Link className="primaryButton linkButton" href="/login">
                로그인으로 이동
              </Link>
            </div>
          )}
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}
