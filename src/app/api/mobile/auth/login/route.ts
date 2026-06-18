import { z } from "zod";
import { createSessionToken, findUserByEmail, verifyPassword } from "@/lib/auth";
import { normalizeEmail } from "@/lib/auth-flows";
import {
  checkRateLimit,
  formatRateLimitMessage,
  getRequestRateLimitKey,
  resetRateLimit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validated = loginSchema.safeParse(body);

  if (!validated.success) {
    return jsonError("이메일과 비밀번호를 다시 확인해주세요.", 400);
  }

  const { password } = validated.data;
  const email = normalizeEmail(validated.data.email);
  const rateLimitKey = getRequestRateLimitKey(request, "mobile-login", email);
  const rateLimit = checkRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return jsonError(formatRateLimitMessage(rateLimit), 429);
  }

  const user = await findUserByEmail(email);

  if (!user) {
    return jsonError("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return jsonError("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  resetRateLimit(rateLimitKey);

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
}
