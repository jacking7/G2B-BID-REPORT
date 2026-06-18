type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: Date;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function normalizeRateLimitKey(key: string) {
  return key.trim().toLowerCase();
}

function cleanupExpiredEntries(now: number) {
  if (rateLimitStore.size < 500) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const normalizedKey = normalizeRateLimitKey(key);
  const existing = rateLimitStore.get(normalizedKey);

  cleanupExpiredEntries(now);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(normalizedKey, {
      attempts: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      retryAfterSeconds: 0,
      resetAt: new Date(resetAt),
    };
  }

  if (existing.attempts >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
      resetAt: new Date(existing.resetAt),
    };
  }

  existing.attempts += 1;
  rateLimitStore.set(normalizedKey, existing);

  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.attempts, 0),
    retryAfterSeconds: 0,
    resetAt: new Date(existing.resetAt),
  };
}

export function resetRateLimit(key: string) {
  rateLimitStore.delete(normalizeRateLimitKey(key));
}

export function formatRateLimitMessage(result: RateLimitResult) {
  const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
  return `요청이 너무 많습니다. ${minutes}분 후 다시 시도해주세요.`;
}

export function getRequestRateLimitKey(
  request: Request,
  scope: string,
  subject: string,
) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const clientIp = forwardedFor || realIp || "unknown";

  return `${scope}:${subject}:${clientIp}`;
}
