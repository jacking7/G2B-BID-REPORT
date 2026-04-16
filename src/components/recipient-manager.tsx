"use client";

import { useActionState } from "react";

type RecipientActionState = {
  message?: string;
  success?: boolean;
};

type RecipientManagerProps = {
  recipients: Array<{
    id: string;
    email: string;
    name: string | null;
  }>;
  addAction: (
    state: RecipientActionState,
    formData: FormData,
  ) => Promise<RecipientActionState>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const initialState: RecipientActionState = {};

export function RecipientManager({
  recipients,
  addAction,
  deleteAction,
}: RecipientManagerProps) {
  const [state, formAction, pending] = useActionState(addAction, initialState);

  return (
    <div className="settingsSection">
      <form action={formAction} className="inlineForm recipientForm">
        <label className="field">
          <span>수신자 이름</span>
          <input type="text" name="name" placeholder="예: 대표 메일" />
        </label>
        <label className="field">
          <span>이메일 주소</span>
          <input
            type="email"
            name="email"
            placeholder="example@company.com"
            required
          />
        </label>
        <button type="submit" className="primaryButton" disabled={pending}>
          {pending ? "추가 중..." : "추가"}
        </button>
      </form>

      {state.message ? (
        <p className={state.success ? "successText" : "formMessage"}>{state.message}</p>
      ) : null}

      <ul className="list settingsList">
        {recipients.length > 0 ? (
          recipients.map((item) => (
            <li key={item.id} className="settingsListItem">
              <div>
                <strong>{item.name ?? "이름 없음"}</strong>
                <p className="muted compactMuted">{item.email}</p>
              </div>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="ghostButton smallButton">
                  삭제
                </button>
              </form>
            </li>
          ))
        ) : (
          <li>등록된 수신자가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
