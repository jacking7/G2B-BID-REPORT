"use client";

import { useActionState, useState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type AuthAction = (
  state: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

type AuthAccessPanelProps = {
  loginAction: AuthAction;
  registerAction: AuthAction;
  requestEmailVerificationAction: AuthAction;
  requestPasswordResetAction: AuthAction;
  requestAccountLookupAction: AuthAction;
  needsFirstAdmin: boolean;
  oauthError?: string;
};

type AuthMode = "login" | "signup" | "recover";

const initialState: AuthActionState = {};

const socialProviders = [
  {
    label: "Google",
    href: "/api/auth/oauth/google/start",
    className: "socialButton google",
  },
  {
    label: "네이버",
    href: "/api/auth/oauth/naver/start",
    className: "socialButton naver",
  },
  {
    label: "카카오",
    href: "/api/auth/oauth/kakao/start",
    className: "socialButton kakao",
  },
];

export function AuthAccessPanel({
  loginAction,
  registerAction,
  requestEmailVerificationAction,
  requestPasswordResetAction,
  requestAccountLookupAction,
  needsFirstAdmin,
  oauthError,
}: AuthAccessPanelProps) {
  const [mode, setMode] = useState<AuthMode>(needsFirstAdmin ? "signup" : "login");
  const [signupEmail, setSignupEmail] = useState("");
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState,
  );
  const [registerState, registerFormAction, registerPending] = useActionState(
    registerAction,
    initialState,
  );
  const [emailState, emailFormAction, emailPending] = useActionState(
    requestEmailVerificationAction,
    initialState,
  );
  const [passwordResetState, passwordResetFormAction, passwordResetPending] =
    useActionState(requestPasswordResetAction, initialState);
  const [accountLookupState, accountLookupFormAction, accountLookupPending] =
    useActionState(requestAccountLookupAction, initialState);

  return (
    <section className="accessPanel" aria-label="계정 접속">
      <div className="accessTabs" role="tablist" aria-label="계정 메뉴">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          로그인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "active" : ""}
          onClick={() => setMode("signup")}
        >
          가입
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "recover"}
          className={mode === "recover" ? "active" : ""}
          onClick={() => setMode("recover")}
        >
          찾기
        </button>
      </div>

      {oauthError ? <p className="formMessage">{oauthError}</p> : null}

      {mode === "login" ? (
        <div className="accessMode">
          <div className="authHeader">
            <h2>다시 이어서 운영하기</h2>
            <p>로그인하면 브라우저 세션이 유지되어 다음 접속 때 자동으로 확인합니다.</p>
          </div>

          <SocialLoginGroup />

          <DividerLabel>또는 이메일로 로그인</DividerLabel>

          <form action={loginFormAction} className="authForm compactAuthForm">
            <label className="field">
              <span>이메일</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                required
              />
              {loginState.errors?.email ? (
                <small className="errorText">{loginState.errors.email[0]}</small>
              ) : null}
            </label>

            <label className="field">
              <span>비밀번호</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="8자 이상 입력"
                minLength={8}
                required
              />
              {loginState.errors?.password ? (
                <small className="errorText">{loginState.errors.password[0]}</small>
              ) : null}
            </label>

            {loginState.message ? <p className="formMessage">{loginState.message}</p> : null}

            <button className="primaryButton" type="submit" disabled={loginPending}>
              {loginPending ? "확인 중..." : "로그인"}
            </button>
          </form>

          <button
            className="textButton"
            type="button"
            onClick={() => setMode("recover")}
          >
            비밀번호 또는 계정을 찾을래요
          </button>
        </div>
      ) : null}

      {mode === "signup" ? (
        <div className="accessMode">
          <div className="authHeader">
            <h2>{needsFirstAdmin ? "첫 관리자 계정 생성" : "새 계정 만들기"}</h2>
            <p>
              이메일 인증 후 계정을 생성합니다. 첫 계정은 관리자, 이후 계정은 사용자
              권한으로 시작합니다.
            </p>
          </div>

          <SocialLoginGroup />

          <DividerLabel>또는 이메일 인증으로 가입</DividerLabel>

          <form action={emailFormAction} className="emailCodeForm">
            <label className="field">
              <span>이메일</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                required
              />
              {emailState.errors?.email ? (
                <small className="errorText">{emailState.errors.email[0]}</small>
              ) : null}
            </label>
            <button className="secondaryButton" type="submit" disabled={emailPending}>
              {emailPending ? "발송 중..." : "인증번호 받기"}
            </button>
          </form>

          {emailState.message ? (
            <p className={emailState.success ? "successText" : "formMessage"}>
              {emailState.message}
            </p>
          ) : null}

          <form action={registerFormAction} className="authForm compactAuthForm">
            <input type="hidden" name="email" value={signupEmail} />
            <label className="field">
              <span>이름</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="이름"
                minLength={2}
                required
              />
              {registerState.errors?.name ? (
                <small className="errorText">{registerState.errors.name[0]}</small>
              ) : null}
            </label>

            <label className="field">
              <span>이메일 인증번호</span>
              <input
                name="emailVerificationCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6자리"
                minLength={6}
                maxLength={6}
                required
              />
              {registerState.errors?.emailVerificationCode ? (
                <small className="errorText">
                  {registerState.errors.emailVerificationCode[0]}
                </small>
              ) : null}
            </label>

            <label className="field">
              <span>비밀번호</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상 입력"
                minLength={8}
                required
              />
              {registerState.errors?.password ? (
                <small className="errorText">{registerState.errors.password[0]}</small>
              ) : null}
            </label>

            {registerState.message ? (
              <p className="formMessage">{registerState.message}</p>
            ) : null}

            <button className="primaryButton" type="submit" disabled={registerPending}>
              {registerPending ? "생성 중..." : needsFirstAdmin ? "관리자 계정 만들기" : "계정 만들기"}
            </button>
          </form>
        </div>
      ) : null}

      {mode === "recover" ? (
        <div className="accessMode recoverGrid">
          <div className="authHeader">
            <h2>계정 접근 복구</h2>
            <p>비밀번호 재설정 링크와 계정 이메일 안내를 받을 수 있습니다.</p>
          </div>

          <form action={passwordResetFormAction} className="authForm compactAuthForm">
            <h3>비밀번호 찾기</h3>
            <label className="field">
              <span>가입 이메일</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                required
              />
              {passwordResetState.errors?.email ? (
                <small className="errorText">{passwordResetState.errors.email[0]}</small>
              ) : null}
            </label>
            {passwordResetState.message ? (
              <p className={passwordResetState.success ? "successText" : "formMessage"}>
                {passwordResetState.message}
              </p>
            ) : null}
            {passwordResetState.resetUrl ? (
              <a className="ghostButton linkButton" href={passwordResetState.resetUrl}>
                개발용 링크 열기
              </a>
            ) : null}
            <button className="secondaryButton" type="submit" disabled={passwordResetPending}>
              {passwordResetPending ? "요청 중..." : "재설정 메일 받기"}
            </button>
          </form>

          <form action={accountLookupFormAction} className="authForm compactAuthForm">
            <h3>아이디 찾기</h3>
            <label className="field">
              <span>확인할 이메일</span>
              <input
                name="lookupEmail"
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                required
              />
              {accountLookupState.errors?.lookupEmail ? (
                <small className="errorText">
                  {accountLookupState.errors.lookupEmail[0]}
                </small>
              ) : null}
            </label>
            {accountLookupState.message ? (
              <p className={accountLookupState.success ? "successText" : "formMessage"}>
                {accountLookupState.message}
              </p>
            ) : null}
            <button className="secondaryButton" type="submit" disabled={accountLookupPending}>
              {accountLookupPending ? "확인 중..." : "계정 안내 받기"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function SocialLoginGroup() {
  return (
    <div className="socialLoginGrid" aria-label="소셜 로그인">
      {socialProviders.map((provider) => (
        <a key={provider.label} className={provider.className} href={provider.href}>
          <span aria-hidden="true">{provider.label[0]}</span>
          {provider.label}로 계속
        </a>
      ))}
    </div>
  );
}

function DividerLabel({ children }: { children: string }) {
  return (
    <div className="dividerLabel" aria-hidden="true">
      <span>{children}</span>
    </div>
  );
}
