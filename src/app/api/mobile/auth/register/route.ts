import { z } from "zod";
import { createSessionToken, createUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  name: z
    .string()
    .trim()
    .min(2, "이름은 2자 이상이어야 합니다.")
    .max(30, "이름은 30자 이하여야 합니다."),
});

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validated = registerSchema.safeParse(body);

  if (!validated.success) {
    return jsonError("이름, 이메일, 비밀번호를 다시 확인해주세요.", 400);
  }

  try {
    const userCount = await prisma.user.count();
    const user = await createUser({
      ...validated.data,
      role: userCount === 0 ? "admin" : "user",
    });
    const mobileUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = await createSessionToken(mobileUser);

    return Response.json({
      token,
      user: mobileUser,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "계정 생성 중 오류가 발생했습니다.",
      400,
    );
  }
}
