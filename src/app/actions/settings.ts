"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { stripAppBasePath } from "@/lib/app-paths";
import { deleteSession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { COLLECTION_MODES } from "@/lib/collection-settings";
import { splitKeywordInput } from "@/lib/keywords";
import { strongPasswordSchema } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  formatRateLimitMessage,
  resetRateLimit,
} from "@/lib/rate-limit";

export type KeywordActionState = {
  message?: string;
  success?: boolean;
};

export type RecipientActionState = {
  message?: string;
  success?: boolean;
};

export type ScheduleActionState = {
  message?: string;
  success?: boolean;
};

export type MemberActionState = {
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
    confirmText?: string[];
  };
  message?: string;
  success?: boolean;
};

const keywordSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "키워드를 입력해주세요.")
    .max(200, "키워드는 200자 이하여야 합니다."),
  type: z.enum(["include", "exclude"]).default("include"),
});

const recipientSchema = z.object({
  name: z.string().trim().max(30, "이름은 30자 이하여야 합니다.").optional(),
  email: z.email("올바른 이메일 주소를 입력해주세요."),
});

const scheduleSchema = z
  .object({
    collectTime: z.string().regex(/^\d{2}:\d{2}$/, "수집 시간을 확인해주세요."),
    sendTime: z.string().regex(/^\d{2}:\d{2}$/, "발송 시간을 확인해주세요."),
    timezone: z.string().trim().min(1, "시간대를 입력해주세요.").max(50),
    active: z.boolean(),
    collectBidNotices: z.boolean(),
    collectPreSpecs: z.boolean(),
    collectOrderPlans: z.boolean(),
    collectionMode: z.enum(COLLECTION_MODES),
  })
  .refine(
    (data) => data.collectBidNotices || data.collectPreSpecs || data.collectOrderPlans,
    {
      path: ["collectBidNotices"],
      message: "수집 대상을 1개 이상 선택해주세요.",
    },
  );

const scheduleActiveSchema = z.object({
  active: z.enum(["true", "false"]),
  returnTo: z.string().optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "새 비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "새 비밀번호가 서로 일치하지 않습니다.",
  });

const withdrawUserSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
  confirmText: z.literal("탈퇴", {
    error: "확인 문구로 탈퇴를 입력해주세요.",
  }),
});

export async function addKeywordAction(
  _state: KeywordActionState,
  formData: FormData,
): Promise<KeywordActionState> {
  const user = await requireUser();

  const validated = keywordSchema.safeParse({
    keyword: formData.get("keyword"),
    type: formData.get("type") ?? "include",
  });

  if (!validated.success) {
    return {
      success: false,
      message: validated.error.flatten().fieldErrors.keyword?.[0],
    };
  }

  const { keyword, type } = validated.data;
  const keywords = splitKeywordInput(keyword);

  if (keywords.some((item) => item.length > 50)) {
    return {
      success: false,
      message: "각 키워드는 50자 이하여야 합니다.",
    };
  }

  const existingKeywords = await prisma.keywordRule.findMany({
    where: {
      userId: user.id,
      keyword: {
        in: keywords,
      },
      type,
      active: true,
    },
    select: {
      keyword: true,
    },
  });
  const existingSet = new Set(existingKeywords.map((item) => item.keyword.toLowerCase()));
  const newKeywords = keywords.filter((item) => !existingSet.has(item.toLowerCase()));

  if (newKeywords.length === 0) {
    return {
      success: false,
      message: "이미 등록된 키워드입니다.",
    };
  }

  await prisma.keywordRule.createMany({
    data: newKeywords.map((item) => ({
      keyword: item,
      type,
      active: true,
      userId: user.id,
    })),
  });

  revalidatePath("/settings");
  redirect("/settings");
}

export async function deleteKeywordAction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");

  if (typeof id !== "string" || !id) {
    return;
  }

  await prisma.keywordRule.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });

  revalidatePath("/settings");
  redirect("/settings");
}

export async function addRecipientAction(
  _state: RecipientActionState,
  formData: FormData,
): Promise<RecipientActionState> {
  const user = await requireUser();

  const validated = recipientSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
  });

  if (!validated.success) {
    return {
      success: false,
      message:
        validated.error.flatten().fieldErrors.email?.[0] ??
        validated.error.flatten().fieldErrors.name?.[0],
    };
  }

  const email = validated.data.email;
  const name = validated.data.name?.trim() || null;

  const existing = await prisma.recipient.findFirst({
    where: {
      userId: user.id,
      email,
      active: true,
    },
  });

  if (existing) {
    return {
      success: false,
      message: "이미 등록된 수신자입니다.",
    };
  }

  await prisma.recipient.create({
    data: {
      email,
      name,
      active: true,
      userId: user.id,
    },
  });

  revalidatePath("/settings");
  redirect("/settings");
}

export async function deleteRecipientAction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");

  if (typeof id !== "string" || !id) {
    return;
  }

  await prisma.recipient.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });

  revalidatePath("/settings");
  redirect("/settings");
}

export async function saveScheduleAction(
  _state: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const user = await requireUser();

  const validated = scheduleSchema.safeParse({
    collectTime: formData.get("collectTime"),
    sendTime: formData.get("sendTime"),
    timezone: formData.get("timezone"),
    active: formData.get("active") === "on",
    collectBidNotices: formData.get("collectBidNotices") === "on",
    collectPreSpecs: formData.get("collectPreSpecs") === "on",
    collectOrderPlans: formData.get("collectOrderPlans") === "on",
    collectionMode: formData.get("collectionMode"),
  });

  if (!validated.success) {
    return {
      success: false,
      message:
        validated.error.flatten().fieldErrors.collectTime?.[0] ??
        validated.error.flatten().fieldErrors.sendTime?.[0] ??
        validated.error.flatten().fieldErrors.timezone?.[0] ??
        validated.error.flatten().fieldErrors.collectBidNotices?.[0] ??
        validated.error.flatten().fieldErrors.collectionMode?.[0],
    };
  }

  const {
    collectTime,
    sendTime,
    timezone,
    active,
    collectBidNotices,
    collectPreSpecs,
    collectOrderPlans,
    collectionMode,
  } = validated.data;

  const existing = await prisma.scheduleSetting.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existing) {
    await prisma.scheduleSetting.update({
      where: {
        id: existing.id,
      },
      data: {
        collectTime,
        sendTime,
        timezone,
        active,
        collectBidNotices,
        collectPreSpecs,
        collectOrderPlans,
        collectionMode,
      },
    });
  } else {
    await prisma.scheduleSetting.create({
      data: {
        collectTime,
        sendTime,
        timezone,
        active,
        collectBidNotices,
        collectPreSpecs,
        collectOrderPlans,
        collectionMode,
        userId: user.id,
      },
    });
  }

  revalidatePath("/settings");
  redirect("/settings");
}

export async function updateScheduleActiveAction(formData: FormData) {
  const user = await requireUser();

  const validated = scheduleActiveSchema.safeParse({
    active: formData.get("active"),
    returnTo: formData.get("returnTo") || undefined,
  });

  const normalizedReturnTo =
    validated.success && validated.data.returnTo
      ? stripAppBasePath(validated.data.returnTo)
      : null;
  const returnTo =
    normalizedReturnTo?.startsWith("/results")
      ? normalizedReturnTo
      : "/results";

  if (!validated.success) {
    redirect(returnTo);
  }

  const active = validated.data.active === "true";
  const existing = await prisma.scheduleSetting.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existing) {
    await prisma.scheduleSetting.update({
      where: {
        id: existing.id,
      },
      data: {
        active,
      },
    });
  } else {
    await prisma.scheduleSetting.create({
      data: {
        collectTime: "18:00",
        sendTime: "09:00",
        timezone: "Asia/Seoul",
        active,
        collectBidNotices: true,
        collectPreSpecs: false,
        collectOrderPlans: false,
        collectionMode: "activeToday",
        userId: user.id,
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/results");
  redirect(returnTo);
}

export async function changePasswordAction(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const user = await requireUser();
  const validated = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "입력값을 다시 확인해주세요.",
      success: false,
    };
  }

  const account = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!account) {
    await deleteSession();
    redirect("/login");
  }

  const { currentPassword, newPassword } = validated.data;
  const rateLimitKey = `settings-change-password:${user.id}`;
  const rateLimit = checkRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      message: formatRateLimitMessage(rateLimit),
      success: false,
    };
  }

  const currentPasswordValid = await verifyPassword(currentPassword, account.passwordHash);

  if (!currentPasswordValid) {
    return {
      message: "현재 비밀번호가 올바르지 않습니다.",
      success: false,
    };
  }

  const samePassword = await verifyPassword(newPassword, account.passwordHash);

  if (samePassword) {
    return {
      errors: {
        newPassword: ["현재 비밀번호와 다른 새 비밀번호를 입력해주세요."],
      },
      message: "새 비밀번호를 다시 확인해주세요.",
      success: false,
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    }),
  ]);

  resetRateLimit(rateLimitKey);
  revalidatePath("/settings");

  return {
    message: "비밀번호가 변경되었습니다.",
    success: true,
  };
}

export async function withdrawUserAction(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const user = await requireUser();
  const validated = withdrawUserSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    confirmText: formData.get("confirmText"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "탈퇴 확인값을 다시 확인해주세요.",
      success: false,
    };
  }

  const account = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!account) {
    await deleteSession();
    redirect("/login");
  }

  const rateLimitKey = `settings-withdraw:${user.id}`;
  const rateLimit = checkRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      message: formatRateLimitMessage(rateLimit),
      success: false,
    };
  }

  const currentPasswordValid = await verifyPassword(
    validated.data.currentPassword,
    account.passwordHash,
  );

  if (!currentPasswordValid) {
    return {
      message: "현재 비밀번호가 올바르지 않습니다.",
      success: false,
    };
  }

  resetRateLimit(rateLimitKey);
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
  await deleteSession();

  redirect("/login");
}
