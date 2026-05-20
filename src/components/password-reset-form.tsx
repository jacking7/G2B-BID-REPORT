"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type PasswordResetFormProps = {
  token: string;
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

const initialState: AuthActionState = {};

export function PasswordResetForm({ token, action }: PasswordResetFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="authForm">
      <input type="hidden" name="token" value={token} />
      <div className="authHeader">
        <h2>새 비밀번호 설정</h2>
        <p>새 비밀번호는 8자 이상으로 입력해주세요.</p>
      </div>

      <label className="field">
        <span>새 비밀번호</span>
        <input name="password" type="password" placeholder="8자 이상 입력" minLength={8} required />
        {state.errors?.password ? (
          <small className="errorText">{state.errors.password[0]}</small>
        ) : null}
      </label>

      {state.message ? (
        <p className={state.success ? "successText" : "formMessage"}>{state.message}</p>
      ) : null}

      {state.success ? (
        <Link className="primaryButton linkButton" href="/login">
          로그인으로 이동
        </Link>
      ) : (
        <button className="primaryButton" type="submit" disabled={pending || !token}>
          {pending ? "변경 중..." : "비밀번호 변경"}
        </button>
      )}
    </form>
  );
}
