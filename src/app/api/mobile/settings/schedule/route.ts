import { z } from "zod";
import { requireMobileSettingsMutation } from "@/app/api/mobile/settings/_security";
import {
  COLLECTION_MODES,
  getCollectionModeLabel,
  getCollectionSourceLabel,
} from "@/lib/collection-settings";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scheduleSchema = z
  .object({
    collectTime: z.string().regex(/^\d{2}:\d{2}$/, "수집 시간을 확인해주세요."),
    sendTime: z.string().regex(/^\d{2}:\d{2}$/, "발송 시간을 확인해주세요."),
    timezone: z.string().trim().min(1, "시간대를 입력해주세요.").max(50),
    active: z.boolean(),
    collectBidNotices: z.boolean(),
    collectPreSpecs: z.boolean(),
    collectOrderPlans: z.boolean(),
    collectionMode: z.enum(COLLECTION_MODES),
  })
  .refine(
    (data) => data.collectBidNotices || data.collectPreSpecs || data.collectOrderPlans,
    {
      path: ["collectBidNotices"],
      message: "수집 대상을 1개 이상 선택해주세요.",
    },
  );

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "수집 설정을 확인해주세요.";
}

function getCollectionSources(schedule: {
  collectBidNotices: boolean;
  collectPreSpecs: boolean;
  collectOrderPlans: boolean;
}) {
  return [
    schedule.collectBidNotices ? getCollectionSourceLabel("bid_notice") : null,
    schedule.collectPreSpecs ? getCollectionSourceLabel("pre_spec") : null,
    schedule.collectOrderPlans ? getCollectionSourceLabel("order_plan") : null,
  ].filter(Boolean);
}

export async function POST(request: Request) {
  const auth = await requireMobileSettingsMutation(request, "schedule");
  if (!auth.ok) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const validated = scheduleSchema.safeParse(payload);

  if (!validated.success) {
    return Response.json(
      { ok: false, message: getValidationMessage(validated.error) },
      { status: 400 },
    );
  }

  const existing = await prisma.scheduleSetting.findFirst({
    where: {
      userId: auth.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const schedule = existing
    ? await prisma.scheduleSetting.update({
        where: {
          id: existing.id,
        },
        data: validated.data,
        select: {
          collectTime: true,
          sendTime: true,
          timezone: true,
          active: true,
          collectBidNotices: true,
          collectPreSpecs: true,
          collectOrderPlans: true,
          collectionMode: true,
        },
      })
    : await prisma.scheduleSetting.create({
        data: {
          ...validated.data,
          userId: auth.user.id,
        },
        select: {
          collectTime: true,
          sendTime: true,
          timezone: true,
          active: true,
          collectBidNotices: true,
          collectPreSpecs: true,
          collectOrderPlans: true,
          collectionMode: true,
        },
      });

  return Response.json({
    ok: true,
    message: "수집 설정을 저장했습니다.",
    settings: {
      schedule,
      collectionSources: getCollectionSources(schedule),
      collectionModeLabel: getCollectionModeLabel(schedule.collectionMode),
    },
  });
}
