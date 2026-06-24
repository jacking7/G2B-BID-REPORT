import { z } from "zod";
import { requireMobileSettingsMutation } from "@/app/api/mobile/settings/_security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  id: z.string().min(1, "삭제할 키워드를 선택해주세요."),
});

export async function POST(request: Request) {
  const auth = await requireMobileSettingsMutation(request, "keywords-delete");
  if (!auth.ok) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const validated = deleteSchema.safeParse(payload);

  if (!validated.success) {
    return Response.json(
      { ok: false, message: validated.error.issues[0]?.message ?? "키워드를 확인해주세요." },
      { status: 400 },
    );
  }

  await prisma.keywordRule.deleteMany({
    where: {
      id: validated.data.id,
      userId: auth.user.id,
    },
  });

  return Response.json({ ok: true, message: "키워드를 삭제했습니다." });
}
