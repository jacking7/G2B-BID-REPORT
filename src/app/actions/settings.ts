"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

const keywordSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "키워드를 입력해주세요.")
    .max(50, "키워드는 50자 이하여야 합니다."),
  type: z.enum(["include", "exclude"]).default("include"),
});

const recipientSchema = z.object({
  name: z.string().trim().max(30, "이름은 30자 이하여야 합니다.").optional(),
  email: z.email("올바른 이메일 주소를 입력해주세요."),
});

const scheduleSchema = z.object({
  collectTime: z.string().regex(/^\d{2}:\d{2}$/, "수집 시간을 확인해주세요."),
  sendTime: z.string().regex(/^\d{2}:\d{2}$/, "발송 시간을 확인해주세요."),
  timezone: z.string().trim().min(1, "시간대를 입력해주세요.").max(50),
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

  const existing = await prisma.keywordRule.findFirst({
    where: {
      userId: user.id,
      keyword,
      type,
      active: true,
    },
  });

  if (existing) {
    return {
      success: false,
      message: "이미 등록된 키워드입니다.",
    };
  }

  await prisma.keywordRule.create({
    data: {
      keyword,
      type,
      active: true,
      userId: user.id,
    },
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
  });

  if (!validated.success) {
    return {
      success: false,
      message:
        validated.error.flatten().fieldErrors.collectTime?.[0] ??
        validated.error.flatten().fieldErrors.sendTime?.[0] ??
        validated.error.flatten().fieldErrors.timezone?.[0],
    };
  }

  const { collectTime, sendTime, timezone } = validated.data;

  const existing = await prisma.scheduleSetting.findFirst({
    where: {
      userId: user.id,
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
        active: true,
      },
    });
  } else {
    await prisma.scheduleSetting.create({
      data: {
        collectTime,
        sendTime,
        timezone,
        active: true,
        userId: user.id,
      },
    });
  }

  revalidatePath("/settings");
  redirect("/settings");
}
