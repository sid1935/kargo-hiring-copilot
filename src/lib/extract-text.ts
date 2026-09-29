import path from "node:path";

/** Extracts plain text from a CV file on disk. Supports .pdf and .docx. */
export async function extractCvText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  }

  if (ext === ".pdf") {
    const fs = await import("node:fs/promises");
    const { PDFParse } = await import("pdf-parse");
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(`Unsupported CV file type: ${ext} (${filePath})`);
}

/**
 * Infers the applied role from a filename prefix (`pm_...` / `spm_...`).
 * Returns null when the filename gives no hint — the caller must ask the
 * founder to tag the role manually, matching the ingest step in the
 * component map.
 */
export function inferRoleFromFilename(fileName: string): "PM" | "SPM" | null {
  const lower = fileName.toLowerCase();
  if (lower.startsWith("spm_") || lower.startsWith("spm-")) return "SPM";
  if (lower.startsWith("pm_") || lower.startsWith("pm-")) return "PM";
  return null;
}

/** Best-effort candidate name guess from a filename, used as a fallback
 * when the CV text itself doesn't yield a clean first line. */
export function guessNameFromFilename(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName));
  const stripped = base.replace(/^(pm|spm)[_-]/i, "").replace(/^\d+[_-]/, "");
  return stripped
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
