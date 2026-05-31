import {
  collectBidNotices,
  CollectionCancelledError,
  type CollectionProgress,
} from "@/lib/bid-collector";

type CollectionJobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

type CollectionJobResult = {
  importedCount: number;
  refreshedCount: number;
  totalMatches: number;
  excludedCount: number;
  scannedCount: number;
  keywords: string[];
};

type CollectionJob = {
  id: string;
  userId: string;
  status: CollectionJobStatus;
  startedAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
  controller: AbortController;
  progress: CollectionProgress;
  message?: string;
  result?: CollectionJobResult;
};

export type CollectionJobSnapshot = Omit<CollectionJob, "controller" | "startedAt" | "updatedAt" | "finishedAt"> & {
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
};

const globalForCollectionJobs = globalThis as typeof globalThis & {
  g2bCollectionJobs?: Map<string, CollectionJob>;
};

const jobs = globalForCollectionJobs.g2bCollectionJobs ?? new Map<string, CollectionJob>();
globalForCollectionJobs.g2bCollectionJobs = jobs;

function buildMessage(result: CollectionJobResult) {
  if (result.keywords.length === 0) {
    return "상단 톱니바퀴 설정에서 포함 키워드를 1개 이상 등록해주세요.";
  }

  if (result.importedCount > 0 || result.refreshedCount > 0) {
    return `공식 나라장터 API 수집 완료. 새로 저장 ${result.importedCount}건, 오늘 다시 표시 ${result.refreshedCount}건입니다. 일치 ${result.totalMatches}건, 제외 ${result.excludedCount}건입니다.`;
  }

  return `공식 나라장터 API 수집 완료. 새로 저장되거나 오늘 다시 표시할 공고가 없습니다. 일치 ${result.totalMatches}건, 제외 ${result.excludedCount}건입니다.`;
}

function snapshot(job?: CollectionJob): CollectionJobSnapshot {
  if (!job) {
    return {
      id: "idle",
      userId: "",
      status: "idle",
      startedAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      progress: {
        phase: "대기",
        current: 0,
        total: 1,
        scannedCount: 0,
        importedCount: 0,
        refreshedCount: 0,
        totalMatches: 0,
        excludedCount: 0,
      },
    };
  }

  return {
    id: job.id,
    userId: job.userId,
    status: job.status,
    startedAt: job.startedAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
    progress: job.progress,
    message: job.message,
    result: job.result,
  };
}

export function getCollectionJobSnapshot(userId: string) {
  return snapshot(jobs.get(userId));
}

export function cancelCollectionJob(userId: string) {
  const job = jobs.get(userId);

  if (!job || job.status !== "running") {
    return snapshot(job);
  }

  job.controller.abort();
  job.status = "cancelled";
  job.message = "수집 중지 요청을 보냈습니다.";
  job.updatedAt = new Date();
  job.finishedAt = job.updatedAt;

  return snapshot(job);
}

export function startCollectionJob(userId: string) {
  const existing = jobs.get(userId);
  if (existing?.status === "running") {
    return snapshot(existing);
  }

  const now = new Date();
  const job: CollectionJob = {
    id: crypto.randomUUID(),
    userId,
    status: "running",
    startedAt: now,
    updatedAt: now,
    controller: new AbortController(),
    progress: {
      phase: "수집 시작",
      current: 0,
      total: 1,
      scannedCount: 0,
      importedCount: 0,
      refreshedCount: 0,
      totalMatches: 0,
      excludedCount: 0,
    },
  };
  jobs.set(userId, job);

  void collectBidNotices(userId, {
    signal: job.controller.signal,
    onProgress: (progress) => {
      job.progress = progress;
      job.updatedAt = new Date();
    },
  })
    .then((result) => {
      if (job.status === "cancelled") {
        return;
      }

      job.status = "completed";
      job.result = {
        importedCount: result.importedCount,
        refreshedCount: result.refreshedCount,
        totalMatches: result.totalMatches,
        excludedCount: result.excludedCount,
        scannedCount: result.scannedCount,
        keywords: result.keywords,
      };
      job.message = buildMessage(job.result);
      job.finishedAt = new Date();
      job.updatedAt = job.finishedAt;
    })
    .catch((error: unknown) => {
      if (error instanceof CollectionCancelledError || job.controller.signal.aborted) {
        job.status = "cancelled";
        job.message = "수집이 중지되었습니다.";
      } else {
        job.status = "failed";
        job.message =
          error instanceof Error ? error.message : "나라장터 API 수집 중 오류가 발생했습니다.";
      }

      job.finishedAt = new Date();
      job.updatedAt = job.finishedAt;
    });

  return snapshot(job);
}
