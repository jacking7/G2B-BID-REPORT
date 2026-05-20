import { requireApiUser } from "@/app/api/collection/_auth";
import { getCollectionJobSnapshot } from "@/lib/collection-job-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  return Response.json({
    ok: true,
    job: getCollectionJobSnapshot(auth.user.id),
  });
}
