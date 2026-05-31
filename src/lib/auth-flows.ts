import { createHash, randomBytes, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const emailVerificationExpiresMinutes = 10;
export const oauthStateExpiresMinutes = 10;
export const passwordResetExpiresMinutes = 30;

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
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
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
