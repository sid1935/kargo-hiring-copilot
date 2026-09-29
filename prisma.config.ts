import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // CLI operations (db push, migrate) use the direct (non-pooled) connection
  // — Supabase's pgbouncer transaction-mode pooler (DATABASE_URL, used by the
  // running app) doesn't support the session-level features schema changes
  // need.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
