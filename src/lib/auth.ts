import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "g2b_session";
const devSessionSecret = "dev-only-auth-secret-change-me";

function shouldUseSecureCookies() {
  const configured = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (configured === "true" || configured === "1" || configured === "yes") {
    return true;
  }

  if (configured === "false" || configured === "0" || configured === "no") {
    return false;
  }

  const appBaseUrl = process.env.APP_BASE_URL;
  if (appBaseUrl) {
    try {
      return new URL(appBaseUrl).protocol === "https:";
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }

  return process.env.NODE_ENV === "production";
}

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret === devSessionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET 환경변수를 프로덕션에 설정해주세요.");
    }

    return devSessionSecret;
  }

  return secret;
}

const sessionKey = new TextEncoder().encode(getSessionSecret());

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  name?: string | null;
  exp?: number;
  iat?: number;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}) {
  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role ?? "admin",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("이미 사용 중인 이메일입니다.");
    }

    throw error;
  }
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionKey);
}

async function decryptSession(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, sessionKey, {
      algorithms: ["HS256"],
    });

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSessionToken(user: AuthUser) {
  return encryptSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
}

export async function getUserFromSessionToken(token?: string): Promise<AuthUser | null> {
  const session = await decryptSession(token);

  if (!session?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

export async function createSession(user: AuthUser) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await createSessionToken(user);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    expires,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  return decryptSession(token);
});

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await getSession();

  if (!session?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
