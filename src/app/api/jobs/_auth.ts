import { headers } from "next/headers";

export async function authorizeJobRequest() {
  const token = process.env.INTERNAL_JOB_TOKEN;

  if (!token) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, message: "INTERNAL_JOB_TOKEN 환경변수가 없습니다." },
        { status: 503 },
      ),
    };
  }

  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "") ?? headerList.get("x-job-token");

  if (provided !== token) {
    return {
      ok: false as const,
      response: Response.json({ ok: false, message: "인증되지 않은 작업 요청입니다." }, { status: 401 }),
    };
  }

  return { ok: true as const };
}
