"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type KeywordActionState = {
  message?: string;
  success?: boolean;
};

const keywordSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "키워드를 입력해주세요.")
    .max(50, "키워드는 50자 이하여야 합니다."),
});

export async function addKeywordAction(
  _state: KeywordActionState,
  formData: FormData,
): Promise<KeywordActionState> {
  const user = await requireUser();

  const validated = keywordSchema.safeParse({
    keyword: formData.get("keyword"),
  });

  if (!validated.success) {
    return {
      success: false,
      message: validated.error.flatten().fieldErrors.keyword?.[0],
    };
  }

  const keyword = validated.data.keyword;

  const existing = await prisma.keywordRule.findFirst({
    where: {
      userId: user.id,
      keyword,
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
      type: "include",
      active: true,
      userId: user.id,
    },
  });

  revalidatePath("/settings");

  return {
    success: true,
    message: "키워드를 추가했습니다.",
  };
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
}
