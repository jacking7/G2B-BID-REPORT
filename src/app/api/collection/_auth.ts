import { getCurrentUser } from "@/lib/auth";

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: Response.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    user,
  };
}
