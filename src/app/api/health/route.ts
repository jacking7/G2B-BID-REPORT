import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const keywordCount = await prisma.keywordRule.count();
    const recipientCount = await prisma.recipient.count();

    return Response.json({
      ok: true,
      database: "connected",
      counts: {
        users: userCount,
        keywords: keywordCount,
        recipients: recipientCount,
      },
      checkedAt: new Date().toISOString(),
    });
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
