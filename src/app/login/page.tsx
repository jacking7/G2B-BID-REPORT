import { redirect } from "next/navigation";
import { loginAction, registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/settings");
  }

  return (
    <main className="authShell">
      <section className="authIntro">
        <div>
          <span className="eyebrow">G2B BID REPORT</span>
          <h1>운영 콘솔 로그인</h1>
          <p>
            키워드, 수신자, 수집 결과를 관리하는 내부 업무 콘솔입니다.
          </p>
        </div>
        <ThemeToggle />
      </section>

      <section className="grid two authGrid">
        <article className="consolePanel">
          <AuthForm
            title="로그인"
            description="이미 생성된 계정으로 로그인합니다."
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
        </article>

        <article className="consolePanel">
          <AuthForm
            title="첫 관리자 계정 생성"
            description="아직 계정이 없다면 여기서 바로 생성할 수 있습니다."
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
        </article>
      </section>
    </main>
  );
}
