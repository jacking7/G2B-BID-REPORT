import { getRequestAppUrl, parseSocialProvider } from "@/lib/auth-flows";
import { completeSocialLogin } from "@/lib/social-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

async function redirectToLogin(message: string) {
  const url = new URL(await getRequestAppUrl("/login"));
  url.searchParams.set("oauthError", message);
  return Response.redirect(url);
}

async function redirectToSettings() {
  return Response.redirect(await getRequestAppUrl("/settings"));
}

export async function GET(request: Request, context: OAuthRouteContext) {
  const { provider: providerValue } = await context.params;
  const provider = parseSocialProvider(providerValue);

  if (!provider) {
    return redirectToLogin("지원하지 않는 소셜 로그인입니다.");
  }

  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return redirectToLogin("소셜 로그인이 취소됐거나 실패했습니다.");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectToLogin("소셜 로그인 응답이 올바르지 않습니다.");
  }

  try {
    await completeSocialLogin({
      provider,
      code,
      state,
    });
  } catch (error) {
    return redirectToLogin(
      error instanceof Error
        ? error.message
        : "소셜 로그인 처리 중 오류가 발생했습니다.",
    );
  }

  return redirectToSettings();
}
