import { parseSocialProvider } from "@/lib/auth-flows";
import {
  completeMobileSocialLogin,
  getNativeRedirectUriFromState,
} from "@/lib/social-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MobileOAuthCallbackContext = {
  params: Promise<{
    provider: string;
  }>;
};

function redirectToNative(redirectUri: string, params: Record<string, string>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return Response.redirect(url);
}

export async function GET(request: Request, context: MobileOAuthCallbackContext) {
  const { provider: providerValue } = await context.params;
  const provider = parseSocialProvider(providerValue);
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const nativeRedirectUri = state ? getNativeRedirectUriFromState(state) : null;

  if (!nativeRedirectUri) {
    return Response.json({ ok: false, message: "모바일 로그인 요청이 올바르지 않습니다." }, { status: 400 });
  }

  if (!provider) {
    return redirectToNative(nativeRedirectUri, { error: "unsupported_provider" });
  }

  if (url.searchParams.get("error")) {
    return redirectToNative(nativeRedirectUri, { error: "cancelled" });
  }

  const code = url.searchParams.get("code");
  if (!code || !state) {
    return redirectToNative(nativeRedirectUri, { error: "invalid_response" });
  }

  try {
    const token = await completeMobileSocialLogin({
      provider,
      code,
      state,
    });
    return redirectToNative(nativeRedirectUri, { token });
  } catch {
    return redirectToNative(nativeRedirectUri, { error: "oauth_failed" });
  }
}
