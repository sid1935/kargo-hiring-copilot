import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are read at runtime via plain fs calls (not imported), so Next's
  // file tracer won't pick them up on its own — without this, the deployed
  // bundle would be missing the CVs, the rubric prompt, and the seed DB.
  outputFileTracingIncludes: {
    "/*": ["data/applications/**/*", "prompts/**/*", "prisma/template.db"],
  },
  experimental: {
    // Default Server Action body limit is 1MB, too small for resume PDFs
    // (especially uploading several at once).
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
