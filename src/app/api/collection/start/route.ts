import { requireApiUser } from "@/app/api/collection/_auth";
import { startCollectionJob } from "@/lib/collection-job-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  return Response.json({
    ok: true,
    job: startCollectionJob(auth.user.id),
  });
}
