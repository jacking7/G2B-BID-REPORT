"use client";

import { useActionState } from "react";

type ScheduleActionState = {
  message?: string;
  success?: boolean;
};

type ScheduleManagerProps = {
  schedule: {
    collectTime: string;
    sendTime: string;
    timezone: string;
  } | null;
  saveAction: (
    state: ScheduleActionState,
    formData: FormData,
  ) => Promise<ScheduleActionState>;
};

const initialState: ScheduleActionState = {};

export function ScheduleManager({ schedule, saveAction }: ScheduleManagerProps) {
  const [state, formAction, pending] = useActionState(saveAction, initialState);

  return (
    <div className="settingsSection">
      <form action={formAction} className="scheduleForm">
        <label className="field">
          <span>수집 시간</span>
          <input
            type="time"
            name="collectTime"
            defaultValue={schedule?.collectTime ?? "18:00"}
            required
          />
        </label>

        <label className="field">
          <span>메일 발송 시간</span>
          <input
            type="time"
            name="sendTime"
            defaultValue={schedule?.sendTime ?? "09:00"}
            required
          />
        </label>

        <label className="field">
          <span>시간대</span>
          <input
            type="text"
            name="timezone"
            defaultValue={schedule?.timezone ?? "Asia/Seoul"}
            placeholder="Asia/Seoul"
            required
          />
        </label>

        <button type="submit" className="primaryButton" disabled={pending}>
          {pending ? "저장 중..." : "스케줄 저장"}
        </button>
      </form>

      {state.message ? (
        <p className={state.success ? "successText" : "formMessage"}>{state.message}</p>
      ) : null}
    </div>
  );
}
