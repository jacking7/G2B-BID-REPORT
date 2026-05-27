import { requireMobileApiUser } from "@/app/api/mobile/_auth";
import { startCollectionJob } from "@/lib/collection-job-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireMobileApiUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  return Response.json({
    ok: true,
    job: startCollectionJob(auth.user.id),
  });
}
