// Prisma client singleton.
// Supports both local SQLite (file:./dev.db) and read-only serverless hosts like Vercel
// by automatically copying the bundled prisma/demo.db into /tmp/sunny.db on first access.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function resolveDatabaseUrl(): string {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const tmpPath = "/tmp/sunny.db";
    if (!fs.existsSync(tmpPath)) {
      const candidatePaths = [
        path.join(process.cwd(), "prisma", "demo.db"),
        path.join(process.cwd(), "prisma", "dev.db"),
      ];
      for (const src of candidatePaths) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, tmpPath);
          break;
        }
      }
    }
    return `file:${tmpPath}`;
  }
  return process.env.DATABASE_URL || "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
