import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { APPLICATIONS_DIR } from "@/lib/candidates";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;
  const safeName = path.basename(fileName); // prevent path traversal
  const filePath = path.join(APPLICATIONS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(safeName).toLowerCase();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"`,
    },
  });
}
