import { requireMobileApiUser } from "@/app/api/mobile/_auth";
import { sendPendingReport } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireMobileApiUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const result = await sendPendingReport(auth.user.id);
  const status = result.success ? 200 : 400;

  return Response.json(
    {
      ok: result.success,
      sentRecipients: result.sentCount,
      message: result.message,
    },
    { status },
  );
}
