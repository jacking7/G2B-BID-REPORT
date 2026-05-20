"use client";

import { useActionState, useState } from "react";

type ScheduleActionState = {
  message?: string;
  success?: boolean;
};

type ScheduleManagerProps = {
  schedule: {
    collectTime: string;
    sendTime: string;
    timezone: string;
    active: boolean;
  } | null;
  saveAction: (
    state: ScheduleActionState,
    formData: FormData,
  ) => Promise<ScheduleActionState>;
};

const initialState: ScheduleActionState = {};

export function ScheduleManager({ schedule, saveAction }: ScheduleManagerProps) {
  const [state, formAction, pending] = useActionState(saveAction, initialState);
  const [active, setActive] = useState(schedule?.active ?? true);

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

        <label className="toggleField">
          <span>
            <strong>자동 실행</strong>
            <small>{active ? "ON" : "OFF"}</small>
          </span>
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(event) => setActive(event.currentTarget.checked)}
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
