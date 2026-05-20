"use client";

import { useActionState } from "react";
import type { MemberActionState } from "@/app/actions/settings";

type MemberManagerProps = {
  user: {
    email: string;
    name: string | null;
  };
  changePasswordAction: (
    state: MemberActionState,
    formData: FormData,
  ) => Promise<MemberActionState>;
  withdrawUserAction: (
    state: MemberActionState,
    formData: FormData,
  ) => Promise<MemberActionState>;
};

const initialState: MemberActionState = {};

export function MemberManager({
  user,
  changePasswordAction,
  withdrawUserAction,
}: MemberManagerProps) {
  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [withdrawState, withdrawFormAction, withdrawPending] = useActionState(
    withdrawUserAction,
    initialState,
  );

  return (
    <div className="memberManager">
      <dl className="accountSummary">
        <div>
          <dt>계정</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>이름</dt>
          <dd>{user.name ?? "미설정"}</dd>
        </div>
      </dl>

      <div className="memberForms">
        <form action={passwordFormAction} className="memberForm">
          <header>
            <h3>비밀번호 변경</h3>
          </header>

          <label className="field">
            <span>현재 비밀번호</span>
            <input name="currentPassword" type="password" autoComplete="current-password" required />
            {passwordState.errors?.currentPassword ? (
              <small className="errorText">{passwordState.errors.currentPassword[0]}</small>
            ) : null}
          </label>

          <label className="field">
            <span>새 비밀번호</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {passwordState.errors?.newPassword ? (
              <small className="errorText">{passwordState.errors.newPassword[0]}</small>
            ) : null}
          </label>

          <label className="field">
            <span>새 비밀번호 확인</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {passwordState.errors?.confirmPassword ? (
              <small className="errorText">{passwordState.errors.confirmPassword[0]}</small>
            ) : null}
          </label>

          {passwordState.message ? (
            <p className={passwordState.success ? "successText" : "formMessage"}>
              {passwordState.message}
            </p>
          ) : null}

          <button className="primaryButton" type="submit" disabled={passwordPending}>
            {passwordPending ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>

        <form action={withdrawFormAction} className="memberForm dangerMemberForm">
          <header>
            <h3>회원 탈퇴</h3>
          </header>

          <label className="field">
            <span>현재 비밀번호</span>
            <input name="currentPassword" type="password" autoComplete="current-password" required />
            {withdrawState.errors?.currentPassword ? (
              <small className="errorText">{withdrawState.errors.currentPassword[0]}</small>
            ) : null}
          </label>

          <label className="field">
            <span>확인 문구</span>
            <input name="confirmText" type="text" placeholder="탈퇴" required />
            {withdrawState.errors?.confirmText ? (
              <small className="errorText">{withdrawState.errors.confirmText[0]}</small>
            ) : null}
          </label>

          {withdrawState.message ? (
            <p className={withdrawState.success ? "successText" : "formMessage"}>
              {withdrawState.message}
            </p>
          ) : null}

          <button className="ghostButton dangerButton" type="submit" disabled={withdrawPending}>
            {withdrawPending ? "탈퇴 처리 중..." : "회원 탈퇴"}
          </button>
        </form>
      </div>
    </div>
  );
}
