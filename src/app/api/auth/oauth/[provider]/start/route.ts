import { getRequestBaseUrl, getSocialProviderLabel, parseSocialProvider } from "@/lib/auth-flows";
import {
  checkRateLimit,
  formatRateLimitMessage,
  getRequestRateLimitKey,
} from "@/lib/rate-limit";
import { createSocialAuthorizationUrl } from "@/lib/social-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

async function redirectToLogin(message: string) {
  const url = new URL("/login", await getRequestBaseUrl());
  url.searchParams.set("oauthError", message);
  return Response.redirect(url);
}

export async function GET(request: Request, context: OAuthRouteContext) {
  const { provider: providerValue } = await context.params;
  const provider = parseSocialProvider(providerValue);

  if (!provider) {
    return redirectToLogin("지원하지 않는 소셜 로그인입니다.");
  }

  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, "web-oauth-start", provider),
    {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  );
  if (!rateLimit.allowed) {
    return redirectToLogin(formatRateLimitMessage(rateLimit));
  }

  const authorizationUrl = await createSocialAuthorizationUrl(provider);
  if (!authorizationUrl) {
    return redirectToLogin(
      `${getSocialProviderLabel(provider)} OAuth 환경변수를 먼저 설정해주세요.`,
    );
  }

  return Response.redirect(authorizationUrl);
}
