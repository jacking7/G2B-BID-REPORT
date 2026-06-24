import { z } from "zod";
import { requireMobileSettingsMutation } from "@/app/api/mobile/settings/_security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recipientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().max(30, "이름은 30자 이하여야 합니다.").optional(),
  email: z.email("올바른 이메일 주소를 입력해주세요."),
});

export async function POST(request: Request) {
  const auth = await requireMobileSettingsMutation(request, "recipients");
  if (!auth.ok) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const validated = recipientSchema.safeParse(payload);

  if (!validated.success) {
    return Response.json(
      { ok: false, message: validated.error.issues[0]?.message ?? "수신자를 확인해주세요." },
      { status: 400 },
    );
  }

  const email = validated.data.email;
  const id = validated.data.id?.trim();
  const name = validated.data.name?.trim() || null;

  const existing = await prisma.recipient.findFirst({
    where: {
      userId: auth.user.id,
      email,
      active: true,
      ...(id ? { NOT: { id } } : {}),
    },
  });

  if (existing) {
    return Response.json({ ok: false, message: "이미 등록된 수신자입니다." }, { status: 409 });
  }

  if (id) {
    await prisma.recipient.updateMany({
      where: {
        id,
        userId: auth.user.id,
      },
      data: {
        email,
        name,
        active: true,
      },
    });

    return Response.json({ ok: true, message: "수신자를 수정했습니다." });
  }

  await prisma.recipient.create({
    data: {
      email,
      name,
      active: true,
      userId: auth.user.id,
    },
  });

  return Response.json({ ok: true, message: "수신자를 추가했습니다." });
}
