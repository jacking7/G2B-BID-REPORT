"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  consumeEmailVerificationCode,
  createEmailVerificationCode,
  createSecretToken,
  emailVerificationExpiresMinutes,
  getRequestBaseUrl,
  hashToken,
  normalizeEmail,
  passwordResetExpiresMinutes,
} from "@/lib/auth-flows";
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import {
  sendAccountLookupEmail,
  sendEmailVerificationCode,
  sendPasswordResetLink,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export type AuthActionState = {
  errors?: {
    email?: string[];
    password?: string[];
    name?: string[];
    token?: string[];
    emailVerificationCode?: string[];
    lookupEmail?: string[];
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
  emailVerificationCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "6자리 인증번호를 입력해주세요."),
});

const passwordResetRequestSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요."),
});

const emailVerificationRequestSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요."),
});

const accountLookupSchema = z.object({
  lookupEmail: z.email("올바른 이메일 주소를 입력해주세요."),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, "재설정 토큰이 없습니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

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
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    };
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return {
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
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
    emailVerificationCode: formData.get("emailVerificationCode"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "입력값을 다시 확인해주세요.",
    };
  }

  try {
    const normalizedEmail = normalizeEmail(validated.data.email);
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return {
        errors: {
          email: ["이미 사용 중인 이메일입니다."],
        },
        message: "이미 가입된 이메일입니다.",
      };
    }

    const emailVerified = await consumeEmailVerificationCode({
      email: normalizedEmail,
      code: validated.data.emailVerificationCode,
    });

    if (!emailVerified) {
      return {
        errors: {
          emailVerificationCode: ["인증번호가 올바르지 않거나 만료됐습니다."],
        },
        message: "이메일 인증을 완료해주세요.",
      };
    }

    const userCount = await prisma.user.count();
    const user = await createUser({
      email: normalizedEmail,
      name: validated.data.name,
      password: validated.data.password,
      role: userCount === 0 ? "admin" : "user",
    });

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

export async function requestEmailVerificationAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = emailVerificationRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "이메일을 다시 확인해주세요.",
    };
  }

  const { email, code } = await createEmailVerificationCode({
    email: validated.data.email,
  });
  const result = await sendEmailVerificationCode({
    email,
    code,
    expiresMinutes: emailVerificationExpiresMinutes,
  }).catch(() => ({ sent: false }));

  return {
    success: result.sent,
    message: result.sent
      ? "인증번호를 이메일로 보냈습니다."
      : process.env.NODE_ENV === "production"
        ? "SMTP 설정을 확인해주세요. 인증번호를 발송하지 못했습니다."
        : `개발 환경 인증번호: ${code}`,
  };
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return {
      success: false,
      message: "등록된 계정이 없습니다. 먼저 첫 관리자 계정을 생성해주세요.",
    };
  }

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
    const token = createSecretToken();
    const tokenHash = hashToken(token);
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

export async function requestAccountLookupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = accountLookupSchema.safeParse({
    lookupEmail: formData.get("lookupEmail"),
  });

  if (!validated.success) {
    return {
      errors: {
        lookupEmail: validated.error.flatten().fieldErrors.lookupEmail,
      },
      message: "이메일을 다시 확인해주세요.",
    };
  }

  const email = normalizeEmail(validated.data.lookupEmail);
  const user = await findUserByEmail(email);

  if (user) {
    await sendAccountLookupEmail({
      email,
      accountEmail: user.email,
    }).catch(() => ({ sent: false }));
  }

  return {
    success: true,
    message: "가입된 계정이면 이메일로 계정 안내를 보냈습니다.",
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
  const tokenHash = hashToken(token);
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
