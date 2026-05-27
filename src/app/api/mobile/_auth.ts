import { getUserFromSessionToken } from "@/lib/auth";

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireMobileApiUser(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false as const,
      response: jsonError("로그인이 필요합니다.", 401),
    };
  }

  const user = await getUserFromSessionToken(token);
  if (!user) {
    return {
      ok: false as const,
      response: jsonError("로그인이 만료됐습니다. 다시 로그인해주세요.", 401),
    };
  }

  return { ok: true as const, user };
}
