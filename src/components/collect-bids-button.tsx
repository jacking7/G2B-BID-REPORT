"use client";

import { useActionState } from "react";
import type { CollectActionState } from "@/app/actions/bids";

type CollectBidsButtonProps = {
  action: (state: CollectActionState) => Promise<CollectActionState>;
};

const initialState: CollectActionState = {};

export function CollectBidsButton({ action }: CollectBidsButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="settingsSection">
      <form action={formAction}>
        <button type="submit" className="primaryButton" disabled={pending}>
          {pending ? "수집 중..." : "실제 수집 실행"}
        </button>
      </form>

      {state.message ? (
        <p className={state.success ? "successText" : "formMessage"}>{state.message}</p>
      ) : null}
    </div>
  );
}
