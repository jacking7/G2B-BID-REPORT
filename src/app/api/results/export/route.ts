import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildResultsWorkbook } from "@/lib/report";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  const workbook = await buildResultsWorkbook(user.id);

  return new NextResponse(new Uint8Array(workbook.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(workbook.fileName)}"`,
    },
  });
}
