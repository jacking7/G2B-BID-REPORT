import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
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
}
