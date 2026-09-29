import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are read at runtime via plain fs calls (not imported), so Next's
  // file tracer won't pick them up on its own — without this, the deployed
  // bundle would be missing the CVs, the rubric prompt, and the seed DB.
  outputFileTracingIncludes: {
    "/*": ["data/applications/**/*", "prompts/**/*", "prisma/template.db"],
  },
};

export default nextConfig;
