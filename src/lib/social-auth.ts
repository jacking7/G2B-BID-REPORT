import { createSecretToken, getRequestAppUrl, hashToken, type SocialProvider } from "@/lib/auth-flows";
import { createSession, createSessionToken, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SocialProfile = {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
};

type ProviderConfig = {
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
};

function env(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function getProviderConfig(provider: SocialProvider): ProviderConfig | null {
  switch (provider) {
    case "google": {
      const clientId = env("GOOGLE_OAUTH_CLIENT_ID");
      const clientSecret = env("GOOGLE_OAUTH_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return null;
      }

      return {
        clientId,
        clientSecret,
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        scopes: ["openid", "email"],
      };
    }
    case "naver": {
      const clientId = env("NAVER_OAUTH_CLIENT_ID");
      const clientSecret = env("NAVER_OAUTH_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return null;
      }

      return {
        clientId,
        clientSecret,
        authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
        tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
        scopes: [],
      };
    }
    case "kakao": {
      const clientId = env("KAKAO_REST_API_KEY") ?? env("KAKAO_OAUTH_CLIENT_ID");
      if (!clientId) {
        return null;
      }

      return {
        clientId,
        clientSecret: env("KAKAO_CLIENT_SECRET"),
        authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
        tokenEndpoint: "https://kauth.kakao.com/oauth/token",
        scopes: ["account_email"],
      };
    }
  }
}

export async function createSocialAuthorizationUrl(provider: SocialProvider) {
  const config = getProviderConfig(provider);
  if (!config) {
    return null;
  }

  const redirectUri = await getRequestAppUrl(`/api/auth/oauth/${provider}/callback`);
  const state = createSecretToken();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state,
  });

  if (config.scopes.length > 0) {
    params.set("scope", config.scopes.join(provider === "kakao" ? "," : " "));
  }

  await prisma.oAuthState.create({
    data: {
      stateHash: hashToken(state),
      provider,
      redirectUri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

export async function createMobileSocialAuthorizationUrl(
  provider: SocialProvider,
  nativeRedirectUri: string,
) {
  const config = getProviderConfig(provider);
  if (!config) {
    return null;
  }

  const redirectUri = await getRequestAppUrl(`/api/mobile/auth/social/${provider}/callback`);
  const state = `${createSecretToken()}.${Buffer.from(nativeRedirectUri).toString("base64url")}`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state,
  });

  if (config.scopes.length > 0) {
    params.set("scope", config.scopes.join(provider === "kakao" ? "," : " "));
  }

  await prisma.oAuthState.create({
    data: {
      stateHash: hashToken(state),
      provider,
      redirectUri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

export function getNativeRedirectUriFromState(state: string) {
  const encodedRedirectUri = state.split(".")[1];
  if (!encodedRedirectUri) {
    return null;
  }

  try {
    const redirectUri = Buffer.from(encodedRedirectUri, "base64url").toString("utf8");
    const parsed = new URL(redirectUri);
    return parsed.protocol === "bidkok:" ? redirectUri : null;
  } catch {
    return null;
  }
}

async function exchangeAuthorizationCode(input: {
  provider: SocialProvider;
  code: string;
  redirectUri: string;
  state: string;
}) {
  const config = getProviderConfig(input.provider);
  if (!config) {
    throw new Error("소셜 로그인 환경변수가 설정되지 않았습니다.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: config.clientId,
    redirect_uri: input.redirectUri,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  if (input.provider === "naver") {
    body.set("state", input.state);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ??
        payload?.error ??
        "소셜 로그인 토큰을 발급받지 못했습니다.",
    );
  }

  return payload.access_token;
}

async function fetchSocialProfile(provider: SocialProvider, accessToken: string): Promise<SocialProfile> {
  if (provider === "google") {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json()) as {
      sub?: string;
      email?: string;
    };

    if (!response.ok || !payload.sub) {
      throw new Error("Google 사용자 정보를 가져오지 못했습니다.");
    }

    return {
      provider,
      providerUserId: payload.sub,
      email: payload.email ?? null,
    };
  }

  if (provider === "naver") {
    const response = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json()) as {
      response?: {
        id?: string;
        email?: string;
      };
    };
    const profile = payload.response;

    if (!response.ok || !profile?.id) {
      throw new Error("네이버 사용자 정보를 가져오지 못했습니다.");
    }

    return {
      provider,
      providerUserId: profile.id,
      email: profile.email ?? null,
    };
  }

  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json()) as {
    id?: number | string;
    kakao_account?: {
      email?: string;
    };
  };

  if (!response.ok || !payload.id) {
    throw new Error("카카오 사용자 정보를 가져오지 못했습니다.");
  }

  return {
    provider,
    providerUserId: String(payload.id),
    email: payload.kakao_account?.email ?? null,
  };
}

export async function completeSocialLogin(input: {
  provider: SocialProvider;
  code: string;
  state: string;
}) {
  const now = new Date();
  const stateHash = hashToken(input.state);
  const storedState = await prisma.oAuthState.findUnique({
    where: {
      stateHash,
    },
  });

  if (
    !storedState ||
    storedState.provider !== input.provider ||
    storedState.usedAt ||
    storedState.expiresAt < now
  ) {
    throw new Error("소셜 로그인 요청이 만료됐습니다. 다시 시도해주세요.");
  }

  await prisma.oAuthState.update({
    where: {
      id: storedState.id,
    },
    data: {
      usedAt: now,
    },
  });

  const accessToken = await exchangeAuthorizationCode({
    provider: input.provider,
    code: input.code,
    redirectUri: storedState.redirectUri,
    state: input.state,
  });
  const profile = await fetchSocialProfile(input.provider, accessToken);

  if (!profile.email) {
    throw new Error("소셜 계정에서 이메일 동의를 받아야 가입할 수 있습니다.");
  }

  const profileEmail = profile.email.toLowerCase();

  const user = await prisma.$transaction(async (tx) => {
    const linkedAccount = await tx.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (linkedAccount) {
      return linkedAccount.user;
    }

    const email = profileEmail;
    let user = await tx.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      const userCount = await tx.user.count();
      user = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(createSecretToken()),
          role: userCount === 0 ? "admin" : "user",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    }

    await tx.socialAccount.create({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email,
        userId: user.id,
      },
    });

    return user;
  });

  await createSession(user);
  return user;
}

export async function completeMobileSocialLogin(input: {
  provider: SocialProvider;
  code: string;
  state: string;
}) {
  const user = await completeSocialLogin(input);
  return createSessionToken(user);
}

export function isSocialAuthConfigured(provider: SocialProvider) {
  return getProviderConfig(provider) !== null;
}
