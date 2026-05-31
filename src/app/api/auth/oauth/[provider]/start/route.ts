import { getSocialProviderLabel, parseSocialProvider } from "@/lib/auth-flows";
import { createSocialAuthorizationUrl } from "@/lib/social-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

function redirectToLogin(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("oauthError", message);
  return Response.redirect(url);
}

export async function GET(request: Request, context: OAuthRouteContext) {
  const { provider: providerValue } = await context.params;
  const provider = parseSocialProvider(providerValue);

  if (!provider) {
    return redirectToLogin(request, "지원하지 않는 소셜 로그인입니다.");
  }

  const authorizationUrl = await createSocialAuthorizationUrl(provider);
  if (!authorizationUrl) {
    return redirectToLogin(
      request,
      `${getSocialProviderLabel(provider)} OAuth 환경변수를 먼저 설정해주세요.`,
    );
  }

  return Response.redirect(authorizationUrl);
}
