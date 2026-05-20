"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type PasswordResetRequestFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

const initialState: AuthActionState = {};

export function PasswordResetRequestForm({ action }: PasswordResetRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="authForm compactAuthForm">
      <div className="authHeader">
        <h2>비밀번호 찾기</h2>
        <p>계정 이메일로 재설정 링크를 보냅니다.</p>
      </div>
      <label className="field">
        <span>이메일</span>
        <input name="email" type="email" placeholder="admin@example.com" required />
        {state.errors?.email ? <small className="errorText">{state.errors.email[0]}</small> : null}
      </label>

      {state.message ? (
        <p className={state.success ? "successText" : "formMessage"}>{state.message}</p>
      ) : null}
      {state.resetUrl ? (
        <a className="inlineResetLink" href={state.resetUrl}>
          개발용 재설정 링크 열기
        </a>
      ) : null}

      <button className="secondaryButton" type="submit" disabled={pending}>
        {pending ? "요청 중..." : "재설정 링크 받기"}
      </button>
    </form>
  );
}
