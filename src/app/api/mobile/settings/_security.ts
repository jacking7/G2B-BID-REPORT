import { requireMobileApiUser } from "@/app/api/mobile/_auth";
import {
  checkRateLimit,
  formatRateLimitMessage,
  getRequestRateLimitKey,
} from "@/lib/rate-limit";

export async function requireMobileSettingsMutation(request: Request, scope: string) {
  const auth = await requireMobileApiUser(request);
  if (!auth.ok) {
    return auth;
  }

  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, `mobile-settings:${scope}`, auth.user.id),
    { limit: 60, windowMs: 15 * 60 * 1000 },
  );

  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, message: formatRateLimitMessage(rateLimit) },
        { status: 429 },
      ),
    };
  }

  return auth;
}
