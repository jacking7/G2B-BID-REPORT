import { z } from "zod";
import { requireMobileSettingsMutation } from "@/app/api/mobile/settings/_security";
import { splitKeywordInput } from "@/lib/keywords";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const keywordSchema = z.object({
  keyword: z.string().trim().min(1, "키워드를 입력해주세요.").max(200, "키워드는 200자 이하여야 합니다."),
  type: z.enum(["include", "exclude"]).default("include"),
});

export async function POST(request: Request) {
  const auth = await requireMobileSettingsMutation(request, "keywords");
  if (!auth.ok) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const validated = keywordSchema.safeParse(payload);

  if (!validated.success) {
    return Response.json(
      { ok: false, message: validated.error.issues[0]?.message ?? "키워드를 확인해주세요." },
      { status: 400 },
    );
  }

  const keywords = splitKeywordInput(validated.data.keyword);
  if (keywords.length === 0) {
    return Response.json({ ok: false, message: "키워드를 입력해주세요." }, { status: 400 });
  }

  if (keywords.some((item) => item.length > 50)) {
    return Response.json(
      { ok: false, message: "각 키워드는 50자 이하여야 합니다." },
      { status: 400 },
    );
  }

  const existingKeywords = await prisma.keywordRule.findMany({
    where: {
      userId: auth.user.id,
      keyword: {
        in: keywords,
      },
      type: validated.data.type,
      active: true,
    },
    select: {
      keyword: true,
    },
  });
  const existingSet = new Set(existingKeywords.map((item) => item.keyword.toLowerCase()));
  const newKeywords = keywords.filter((item) => !existingSet.has(item.toLowerCase()));

  if (newKeywords.length === 0) {
    return Response.json({ ok: false, message: "이미 등록된 키워드입니다." }, { status: 409 });
  }

  await prisma.keywordRule.createMany({
    data: newKeywords.map((item) => ({
      keyword: item,
      type: validated.data.type,
      active: true,
      userId: auth.user.id,
    })),
  });

  return Response.json({ ok: true, message: "키워드를 저장했습니다." });
}
