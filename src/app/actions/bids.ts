"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { collectBidNotices } from "@/lib/bid-collector";
import { sendPendingReport } from "@/lib/mail";

export type CollectActionState = {
  message?: string;
  success?: boolean;
};

export type MailActionState = {
  message?: string;
  success?: boolean;
};

export async function collectBidNoticesAction(
  state: CollectActionState,
): Promise<CollectActionState> {
  void state;

  const user = await requireUser();
  const result = await collectBidNotices(user.id).catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "나라장터 API 수집 중 오류가 발생했습니다.";
    return { error: message };
  });

  if ("error" in result) {
    return {
      success: false,
      message: result.error,
    };
  }

  revalidatePath("/results");

  if (result.keywords.length === 0) {
    return {
      success: false,
      message: "상단 톱니바퀴 설정에서 포함 키워드를 1개 이상 등록해주세요.",
    };
  }

  return {
    success: true,
    message:
      result.importedCount > 0 || result.refreshedCount > 0
        ? `공식 나라장터 API 수집 완료. 새로 저장 ${result.importedCount}건, 오늘 다시 표시 ${result.refreshedCount}건입니다. 일치 ${result.totalMatches}건, 제외 ${result.excludedCount}건입니다.`
        : `공식 나라장터 API 수집 완료. 새로 저장되거나 오늘 다시 표시할 공고가 없습니다. 일치 ${result.totalMatches}건, 제외 ${result.excludedCount}건입니다.`,
  };
}

export async function sendBidReportAction(state: MailActionState): Promise<MailActionState> {
  void state;

  const user = await requireUser();
  const result = await sendPendingReport(user.id);

  revalidatePath("/results");

  return {
    success: result.success,
    message: result.message,
  };
}
