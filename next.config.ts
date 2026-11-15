import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the pre-seeded SQLite demo database with serverless functions
  // (used when deployed to a read-only host such as Vercel — see src/lib/db.ts).
  outputFileTracingIncludes: {
    "/**": ["./prisma/demo.db"],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;

