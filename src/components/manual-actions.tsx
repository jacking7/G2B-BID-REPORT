"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MailActionState } from "@/app/actions/bids";

type ManualActionsProps = {
  sendAction: (state: MailActionState) => Promise<MailActionState>;
};

const initialMailState: MailActionState = {};

type CollectionJobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

type CollectionJobSnapshot = {
  status: CollectionJobStatus;
  message?: string;
  progress: {
    phase: string;
    current: number;
    total: number;
    keyword?: string;
    endpoint?: string;
    scannedCount: number;
    importedCount: number;
    refreshedCount: number;
    totalMatches: number;
    excludedCount: number;
  };
};

export function ManualActions({ sendAction }: ManualActionsProps) {
  const router = useRouter();
  const [job, setJob] = useState<CollectionJobSnapshot | null>(null);
  const [collectMessage, setCollectMessage] = useState<string | null>(null);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [mailState, mailFormAction, mailPending] = useActionState(
    sendAction,
    initialMailState,
  );

  const isRunning = job?.status === "running";
  const progress = job?.progress;
  const percent = useMemo(() => {
    if (!progress?.total) {
      return 0;
    }

    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  }, [progress]);

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/collection/status", { cache: "no-store" });
    const data = (await response.json()) as { ok: boolean; job?: CollectionJobSnapshot; message?: string };

    if (!response.ok || !data.ok || !data.job) {
      throw new Error(data.message ?? "수집 상태를 확인할 수 없습니다.");
    }

    setJob(data.job);
    if (data.job.message) {
      if (data.job.status === "failed") {
        setCollectError(data.job.message);
        setCollectMessage(null);
      } else {
        setCollectMessage(data.job.message);
        setCollectError(null);
      }
    }

    if (["completed", "failed", "cancelled"].includes(data.job.status)) {
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    void loadStatus().catch(() => undefined);
  }, [loadStatus]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadStatus().catch((error: unknown) => {
        setCollectError(error instanceof Error ? error.message : "수집 상태 확인 중 오류가 발생했습니다.");
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, loadStatus]);

  async function startCollection() {
    setStarting(true);
    setCollectMessage(null);
    setCollectError(null);

    try {
      const response = await fetch("/api/collection/start", { method: "POST" });
      const data = (await response.json()) as { ok: boolean; job?: CollectionJobSnapshot; message?: string };

      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.message ?? "수집을 시작할 수 없습니다.");
      }

      setJob(data.job);
    } catch (error) {
      setCollectError(error instanceof Error ? error.message : "수집 시작 중 오류가 발생했습니다.");
    } finally {
      setStarting(false);
    }
  }

  async function stopCollection() {
    setStopping(true);

    try {
      const response = await fetch("/api/collection/cancel", { method: "POST" });
      const data = (await response.json()) as { ok: boolean; job?: CollectionJobSnapshot; message?: string };

      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.message ?? "수집 중지 요청에 실패했습니다.");
      }

      setJob(data.job);
      setCollectMessage(data.job.message ?? "수집 중지 요청을 보냈습니다.");
      setCollectError(null);
    } catch (error) {
      setCollectError(error instanceof Error ? error.message : "수집 중지 중 오류가 발생했습니다.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="manualActions">
      <div className="manualActionButtons">
        <button
          type="button"
          className="primaryButton"
          disabled={starting || isRunning}
          onClick={startCollection}
        >
          {isRunning ? "수집 중..." : starting ? "시작 중..." : "실제 수집 실행"}
        </button>

        {isRunning ? (
          <button
            type="button"
            className="ghostButton"
            disabled={stopping}
            onClick={stopCollection}
          >
            {stopping ? "중지 요청 중..." : "수집 중지"}
          </button>
        ) : null}

        <form action={mailFormAction}>
          <button type="submit" className="secondaryButton" disabled={mailPending}>
            {mailPending ? "발송 중..." : "신규 결과 메일 발송"}
          </button>
        </form>
      </div>

      <div className="collectionProgressPanel" aria-live="polite">
        <div className="progressHeader">
          <div>
            <strong>{progress?.phase ?? "대기"}</strong>
            <span>
              {progress?.keyword ? `${progress.keyword} 검색 중` : "공식 나라장터 API 기준"}
            </span>
          </div>
          <b>{percent}%</b>
        </div>
        <div className="progressTrack" aria-label="수집 진행률">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="progressStats">
          <span>조회 {progress?.scannedCount ?? 0}건</span>
          <span>일치 {progress?.totalMatches ?? 0}건</span>
          <span>새 저장 {progress?.importedCount ?? 0}건</span>
          <span>다시 표시 {progress?.refreshedCount ?? 0}건</span>
          <span>제외 {progress?.excludedCount ?? 0}건</span>
        </div>
      </div>

      <div className="manualActionMessages" aria-live="polite">
        {collectMessage ? <p className="successText">{collectMessage}</p> : null}
        {collectError ? <p className="formMessage">{collectError}</p> : null}

        {mailState.message ? (
          <p className={mailState.success ? "successText" : "formMessage"}>
            {mailState.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
