"use client";

import { useActionState, useState } from "react";
import {
  COLLECTION_MODE_LABELS,
  COLLECTION_MODES,
  COLLECTION_SOURCE_LABELS,
  DEFAULT_COLLECTION_MODE,
  type CollectionMode,
} from "@/lib/collection-settings";

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
    collectBidNotices: boolean;
    collectPreSpecs: boolean;
    collectOrderPlans: boolean;
    collectionMode: string;
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
  const collectionMode = COLLECTION_MODES.includes(schedule?.collectionMode as CollectionMode)
    ? (schedule?.collectionMode as CollectionMode)
    : DEFAULT_COLLECTION_MODE;

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

        <fieldset className="settingsFieldset">
          <legend>수집 대상</legend>
          <label className="toggleField">
            <span>
              <strong>{COLLECTION_SOURCE_LABELS.bid_notice}</strong>
              <small>기존 나라장터 입찰공고</small>
            </span>
            <input
              type="checkbox"
              name="collectBidNotices"
              defaultChecked={schedule?.collectBidNotices ?? true}
            />
          </label>
          <label className="toggleField">
            <span>
              <strong>{COLLECTION_SOURCE_LABELS.pre_spec}</strong>
              <small>나라장터 사전규격</small>
            </span>
            <input
              type="checkbox"
              name="collectPreSpecs"
              defaultChecked={schedule?.collectPreSpecs ?? false}
            />
          </label>
          <label className="toggleField">
            <span>
              <strong>{COLLECTION_SOURCE_LABELS.order_plan}</strong>
              <small>나라장터 발주계획</small>
            </span>
            <input
              type="checkbox"
              name="collectOrderPlans"
              defaultChecked={schedule?.collectOrderPlans ?? false}
            />
          </label>
        </fieldset>

        <fieldset className="settingsFieldset">
          <legend>수집 기준</legend>
          <label className="choiceField">
            <input
              type="radio"
              name="collectionMode"
              value="activeToday"
              defaultChecked={collectionMode === "activeToday"}
            />
            <span>{COLLECTION_MODE_LABELS.activeToday}</span>
          </label>
          <label className="choiceField">
            <input
              type="radio"
              name="collectionMode"
              value="postedToday"
              defaultChecked={collectionMode === "postedToday"}
            />
            <span>{COLLECTION_MODE_LABELS.postedToday}</span>
          </label>
          <label className="choiceField">
            <input
              type="radio"
              name="collectionMode"
              value="unreported"
              defaultChecked={collectionMode === "unreported"}
            />
            <span>{COLLECTION_MODE_LABELS.unreported}</span>
          </label>
        </fieldset>

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
