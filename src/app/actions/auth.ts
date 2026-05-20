"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetLink } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export type AuthActionState = {
  errors?: {
    email?: string[];
    password?: string[];
    name?: string[];
    token?: string[];
  };
  message?: string;
  success?: boolean;
  resetUrl?: string;
};

const loginSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

const registerSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "이름은 2자 이상이어야 합니다.")
    .max(30, "이름은 30자 이하여야 합니다."),
});

const passwordResetRequestSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요."),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, "재설정 토큰이 없습니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

const passwordResetExpiresMinutes = 30;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getRequestBaseUrl() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "입력값을 다시 확인해주세요.",
    };
  }

  const { email, password } = validated.data;
  const user = await findUserByEmail(email);

  if (!user) {
    return {
      message: "일치하는 사용자가 없습니다.",
    };
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return {
      message: "비밀번호가 올바르지 않습니다.",
    };
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect("/settings");
}

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "입력값을 다시 확인해주세요.",
    };
  }

  try {
    const user = await createUser(validated.data);

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "계정 생성 중 오류가 발생했습니다.",
    };
  }

  redirect("/settings");
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "이메일을 다시 확인해주세요.",
    };
  }

  const { email } = validated.data;
  const user = await findUserByEmail(email);
  let devResetUrl: string | undefined;

  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const baseUrl = await getRequestBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    devResetUrl = resetUrl;

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + passwordResetExpiresMinutes * 60 * 1000),
      },
    });

    await sendPasswordResetLink({
      email: user.email,
      resetUrl,
      expiresMinutes: passwordResetExpiresMinutes,
    }).catch(() => ({ sent: false }));
  }

  return {
    success: true,
    message:
      process.env.NODE_ENV !== "production" && devResetUrl
        ? "개발 환경용 재설정 링크를 생성했습니다."
        : "등록된 이메일이면 비밀번호 재설정 안내를 발송했습니다.",
    resetUrl: process.env.NODE_ENV !== "production" ? devResetUrl : undefined,
  };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "입력값을 다시 확인해주세요.",
    };
  }

  const { token, password } = validated.data;
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return {
      success: false,
      message: "재설정 링크가 만료됐거나 이미 사용됐습니다.",
    };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  return {
    success: true,
    message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.",
  };
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
