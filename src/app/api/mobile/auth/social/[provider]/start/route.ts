import { getSocialProviderLabel, parseSocialProvider } from "@/lib/auth-flows";
import {
  checkRateLimit,
  formatRateLimitMessage,
  getRequestRateLimitKey,
} from "@/lib/rate-limit";
import { createMobileSocialAuthorizationUrl } from "@/lib/social-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MobileOAuthStartContext = {
  params: Promise<{
    provider: string;
  }>;
};

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

function isAllowedNativeRedirectUri(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "bidkok:" && url.hostname === "auth" && url.pathname === "/callback";
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: MobileOAuthStartContext) {
  const { provider: providerValue } = await context.params;
  const provider = parseSocialProvider(providerValue);
  if (!provider) {
    return jsonError("지원하지 않는 소셜 로그인입니다.", 400);
  }

  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, "mobile-oauth-start", provider),
    {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  );
  if (!rateLimit.allowed) {
    return jsonError(formatRateLimitMessage(rateLimit), 429);
  }

  const body = (await request.json().catch(() => null)) as { redirectUri?: unknown } | null;
  if (!isAllowedNativeRedirectUri(body?.redirectUri)) {
    return jsonError("모바일 리다이렉트 URI가 올바르지 않습니다.", 400);
  }

  const authorizationUrl = await createMobileSocialAuthorizationUrl(provider, body.redirectUri);
  if (!authorizationUrl) {
    return jsonError(`${getSocialProviderLabel(provider)} OAuth 환경변수를 먼저 설정해주세요.`, 503);
  }

  return Response.json({
    ok: true,
    authorizationUrl,
  });
}
