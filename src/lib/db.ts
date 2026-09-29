import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Vercel's deployment bundle is read-only, and /tmp is the only writable
 * path — wiped on every cold start. There is no real persistence there;
 * this only lets the app boot and work within a single warm instance. See
 * README for why this isn't a substitute for a real hosted database.
 */
function resolveDatabaseUrl(): string {
  if (!process.env.VERCEL) return process.env.DATABASE_URL ?? "file:./dev.db";

  const runtimeDb = "/tmp/dev.db";
  if (!fs.existsSync(runtimeDb)) {
    const template = path.join(process.cwd(), "prisma", "template.db");
    fs.copyFileSync(template, runtimeDb);
  }
  return `file:${runtimeDb}`;
}

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
