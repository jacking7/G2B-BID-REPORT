import { redirect } from "next/navigation";
import { loginAction, registerAction, requestPasswordResetAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { PasswordResetRequestForm } from "@/components/password-reset-request-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/settings");
  }

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
              <strong>오늘 기준 수집</strong>
              <span>공고 기간에 오늘이 포함된 건만 저장</span>
            </li>
            <li>
              <strong>키워드 필터</strong>
              <span>포함/제외 키워드로 사용자별 결과 관리</span>
            </li>
            <li>
              <strong>메일 리포트</strong>
              <span>미발송 결과를 Excel 첨부 메일로 발송</span>
            </li>
          </ul>
        </div>

        <div className="productLoginContent">
          <div className="loginUtilityRow">
            <ThemeToggle />
          </div>

          <AuthForm
            title="로그인"
            description="등록된 운영자 계정으로 접속합니다."
            action={loginAction}
            submitLabel="로그인"
            fields={[
              {
                name: "email",
                label: "이메일",
                type: "email",
                placeholder: "admin@example.com",
              },
              {
                name: "password",
                label: "비밀번호",
                type: "password",
                placeholder: "8자 이상 입력",
              },
            ]}
          />

          <details className="registerDisclosure">
            <summary>
              <span>비밀번호를 잊은 경우</span>
              <strong>비밀번호 찾기</strong>
            </summary>
            <PasswordResetRequestForm action={requestPasswordResetAction} />
          </details>

          <details className="registerDisclosure">
            <summary>
              <span>처음 사용하는 경우</span>
              <strong>관리자 계정 생성</strong>
            </summary>
            <AuthForm
              title="첫 관리자 계정 생성"
              description="운영자 계정이 아직 없다면 여기서 생성합니다."
              action={registerAction}
              submitLabel="관리자 계정 만들기"
              fields={[
                {
                  name: "name",
                  label: "이름",
                  type: "text",
                  placeholder: "운영자 이름",
                },
                {
                  name: "email",
                  label: "이메일",
                  type: "email",
                  placeholder: "admin@example.com",
                },
                {
                  name: "password",
                  label: "비밀번호",
                  type: "password",
                  placeholder: "영문, 숫자 포함 8자 이상 권장",
                },
              ]}
            />
          </details>
        </div>
      </section>
    </main>
  );
}
