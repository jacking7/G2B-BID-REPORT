"use client";

import { useActionState } from "react";
import type { KeywordActionState } from "@/app/actions/settings";

type KeywordManagerProps = {
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
  keywords,
  addAction,
  deleteAction,
}: KeywordManagerProps) {
  const [state, formAction, pending] = useActionState(addAction, initialState);

  return (
    <div className="settingsSection">
      <form action={formAction} className="inlineForm">
        <label className="field">
          <span>키워드 추가</span>
          <input
            type="text"
            name="keyword"
            placeholder="예: 클라우드, 데이터, AI"
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
          <li>등록된 키워드가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
