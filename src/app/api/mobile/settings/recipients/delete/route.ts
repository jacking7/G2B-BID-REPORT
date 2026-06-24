import { z } from "zod";
import { requireMobileSettingsMutation } from "@/app/api/mobile/settings/_security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  id: z.string().min(1, "삭제할 수신자를 선택해주세요."),
});

export async function POST(request: Request) {
  const auth = await requireMobileSettingsMutation(request, "recipients-delete");
  if (!auth.ok) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const validated = deleteSchema.safeParse(payload);

  if (!validated.success) {
    return Response.json(
      { ok: false, message: validated.error.issues[0]?.message ?? "수신자를 확인해주세요." },
      { status: 400 },
    );
  }

  await prisma.recipient.deleteMany({
    where: {
      id: validated.data.id,
      userId: auth.user.id,
    },
  });

  return Response.json({ ok: true, message: "수신자를 삭제했습니다." });
}
