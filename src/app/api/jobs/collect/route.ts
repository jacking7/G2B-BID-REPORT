import { authorizeJobRequest } from "@/app/api/jobs/_auth";
import { runCollectionJobs } from "@/lib/scheduler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizeJobRequest();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const result = await runCollectionJobs({ userId: body.userId });

  return Response.json({
    ok: true,
    mode: body.userId ? "single-user" : "all-active-users",
    ...result,
  });
}
