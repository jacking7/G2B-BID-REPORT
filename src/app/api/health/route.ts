import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await prisma.user.count();

    const url = new URL(request.url);
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const jobToken = process.env.INTERNAL_JOB_TOKEN;
    const includeCounts =
      url.searchParams.get("detailed") === "1" &&
      Boolean(jobToken) &&
      token === jobToken;

    const payload: Record<string, unknown> = {
      ok: true,
      database: "connected",
      checkedAt: new Date().toISOString(),
    };

    if (includeCounts) {
      const [users, keywords, recipients] = await Promise.all([
        prisma.user.count(),
        prisma.keywordRule.count(),
        prisma.recipient.count(),
      ]);

      payload.counts = { users, keywords, recipients };
    }

    return Response.json(payload);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return Response.json(
        {
          ok: false,
          database: "schema-missing",
          message:
            "DB 테이블이 아직 없습니다. `npm run db:migrate`로 Prisma 마이그레이션을 먼저 실행해주세요.",
          checkedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        ok: false,
        database: "error",
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
