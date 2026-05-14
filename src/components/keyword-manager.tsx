"use client";

import { useActionState } from "react";
import type { KeywordActionState } from "@/app/actions/settings";

type KeywordManagerProps = {
  title: string;
  description: string;
  type: "include" | "exclude";
  emptyMessage: string;
  keywords: Array<{
    id: string;
    keyword: string;
  }>;
  addAction: (
    state: KeywordActionState,
    formData: FormData,
  ) => Promise<KeywordActionState>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const initialState: KeywordActionState = {};

export function KeywordManager({
  title,
  description,
  type,
  emptyMessage,
  keywords,
  addAction,
  deleteAction,
}: KeywordManagerProps) {
  const [state, formAction, pending] = useActionState(addAction, initialState);

  return (
    <div className="settingsSection">
      <div>
        <h3>{title}</h3>
        <p className="muted compactMuted">{description}</p>
      </div>

      <form action={formAction} className="inlineForm">
        <input type="hidden" name="type" value={type} />
        <label className="field">
          <span>{type === "include" ? "포함 키워드 추가" : "제외 키워드 추가"}</span>
          <input
            type="text"
            name="keyword"
            placeholder={type === "include" ? "예: 클라우드, 데이터, AI" : "예: 유지보수, 단순 구매"}
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
        {keywords.length > 0 ? (
          keywords.map((item) => (
            <li key={item.id} className="settingsListItem">
              <span>{item.keyword}</span>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="ghostButton smallButton">
                  삭제
                </button>
              </form>
            </li>
          ))
        ) : (
          <li>{emptyMessage}</li>
        )}
      </ul>
    </div>
  );
}
