import { NextResponse } from "next/server";
import { auditLogToCsv } from "@/lib/audit";

export async function GET() {
  const csv = await auditLogToCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="kargo-audit-log.csv"`,
    },
  });
}
