"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  verifyPassword,
} from "@/lib/auth";

export type AuthActionState = {
  errors?: {
    email?: string[];
    password?: string[];
    name?: string[];
  };
  message?: string;
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

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
