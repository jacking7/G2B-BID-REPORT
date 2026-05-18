"use client";

import { useActionState } from "react";
import type { CollectActionState, MailActionState } from "@/app/actions/bids";

type ManualActionsProps = {
  collectAction: (state: CollectActionState) => Promise<CollectActionState>;
  sendAction: (state: MailActionState) => Promise<MailActionState>;
};

const initialCollectState: CollectActionState = {};
const initialMailState: MailActionState = {};

export function ManualActions({ collectAction, sendAction }: ManualActionsProps) {
  const [collectState, collectFormAction, collectPending] = useActionState(
    collectAction,
    initialCollectState,
  );
  const [mailState, mailFormAction, mailPending] = useActionState(
    sendAction,
    initialMailState,
  );

  return (
    <div className="manualActions">
      <div className="manualActionButtons">
        <form action={collectFormAction}>
          <button type="submit" className="primaryButton" disabled={collectPending}>
            {collectPending ? "수집 중..." : "실제 수집 실행"}
          </button>
        </form>

        <form action={mailFormAction}>
          <button type="submit" className="secondaryButton" disabled={mailPending}>
            {mailPending ? "발송 중..." : "신규 결과 메일 발송"}
          </button>
        </form>
      </div>

      <div className="manualActionMessages" aria-live="polite">
        {collectState.message ? (
          <p className={collectState.success ? "successText" : "formMessage"}>
            {collectState.message}
          </p>
        ) : null}

        {mailState.message ? (
          <p className={mailState.success ? "successText" : "formMessage"}>
            {mailState.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
