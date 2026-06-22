import { createHash, randomBytes, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { appUrl } from "@/lib/app-paths";
import { prisma } from "@/lib/prisma";

export const emailVerificationExpiresMinutes = 10;
export const oauthStateExpiresMinutes = 10;
export const passwordResetExpiresMinutes = 30;
const productionBaseUrl = "https://bca.ai.kr";
const localHostnames = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export type SocialProvider = "google" | "naver" | "kakao";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createNumericCode() {
  return String(randomInt(100000, 1000000));
}

export function createSecretToken() {
  return randomBytes(32).toString("base64url");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function isLocalHostname(hostname: string) {
  return localHostnames.has(hostname.toLowerCase());
}

function getHostnameFromHostHeader(host: string) {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    return trimmed.slice(1, trimmed.indexOf("]"));
  }

  return trimmed.split(":")[0] ?? trimmed;
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function isLocalBaseUrl(value: string) {
  try {
    return isLocalHostname(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function hashEmailVerificationCode(input: {
  email: string;
  purpose: string;
  code: string;
}) {
  return hashToken(
    `${normalizeEmail(input.email)}:${input.purpose}:${input.code.trim()}`,
  );
}

export async function createEmailVerificationCode(input: {
  email: string;
  purpose?: string;
}) {
  const purpose = input.purpose ?? "register";
  const email = normalizeEmail(input.email);
  const code = createNumericCode();

  await prisma.emailVerificationCode.create({
    data: {
      email,
      purpose,
      codeHash: hashEmailVerificationCode({ email, purpose, code }),
      expiresAt: new Date(
        Date.now() + emailVerificationExpiresMinutes * 60 * 1000,
      ),
    },
  });

  return { email, purpose, code };
}

export async function consumeEmailVerificationCode(input: {
  email: string;
  purpose?: string;
  code: string;
}) {
  const purpose = input.purpose ?? "register";
  const email = normalizeEmail(input.email);
  const now = new Date();
  const verification = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
      purpose,
      codeHash: hashEmailVerificationCode({ email, purpose, code: input.code }),
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verification) {
    return false;
  }

  await prisma.emailVerificationCode.update({
    where: {
      id: verification.id,
    },
    data: {
      usedAt: now,
    },
  });

  return true;
}

export async function getRequestBaseUrl() {
  const headerStore = await headers();
  const forwardedHost = firstHeaderValue(headerStore.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(headerStore.get("host"));
  const forwardedProto = firstHeaderValue(headerStore.get("x-forwarded-proto"));
  const appBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);

  if (appBaseUrl) {
    if (process.env.NODE_ENV !== "production" || !isLocalBaseUrl(appBaseUrl)) {
      return appBaseUrl;
    }
  }

  if (!host) {
    return process.env.NODE_ENV === "production" ? productionBaseUrl : "http://localhost:3000";
  }

  const protocol = forwardedProto ?? (isLocalHostname(getHostnameFromHostHeader(host)) ? "http" : "https");
  const requestBaseUrl = `${protocol}://${host}`;

  if (process.env.NODE_ENV === "production" && isLocalBaseUrl(requestBaseUrl)) {
    return productionBaseUrl;
  }

  return requestBaseUrl;
}

export async function getRequestAppUrl(path: string) {
  return appUrl(await getRequestBaseUrl(), path).toString();
}

export function getSocialProviderLabel(provider: SocialProvider) {
  switch (provider) {
    case "google":
      return "Google";
    case "naver":
      return "네이버";
    case "kakao":
      return "카카오";
  }
}

export function parseSocialProvider(value: string): SocialProvider | null {
  if (value === "google" || value === "naver" || value === "kakao") {
    return value;
  }

  return null;
}
