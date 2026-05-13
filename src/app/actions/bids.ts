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
  const result = await collectBidNotices(user.id);

  revalidatePath("/results");

  if (result.keywords.length === 0) {
    return {
      success: false,
      message: "먼저 설정 화면에서 포함 키워드를 1개 이상 등록해주세요.",
    };
  }

  return {
    success: true,
    message:
      result.importedCount > 0
        ? `수집 완료, ${result.importedCount}건의 신규 공고를 저장했습니다. (${result.source === "live" ? "실제 수집" : "샘플 대체"})`
        : `수집은 완료됐고, 저장할 신규 공고는 없었습니다. 일치 건수는 ${result.totalMatches}건입니다. (${result.source === "live" ? "실제 수집" : "샘플 대체"})`,
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
