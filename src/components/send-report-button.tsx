"use client";

import { useActionState } from "react";
import type { MailActionState } from "@/app/actions/bids";

type SendReportButtonProps = {
  action: (state: MailActionState) => Promise<MailActionState>;
  label?: string;
};

const initialState: MailActionState = {};

export function SendReportButton({ action, label = "신규 결과 메일 발송" }: SendReportButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="settingsSection">
      <form action={formAction}>
        <button type="submit" className="secondaryButton" disabled={pending}>
          {pending ? "발송 중..." : label}
        </button>
      </form>

      {state.message ? (
        <p className={state.success ? "successText" : "formMessage"}>{state.message}</p>
      ) : null}
    </div>
  );
}
