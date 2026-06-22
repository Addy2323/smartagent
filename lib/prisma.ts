import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Only log warnings and errors in production; log queries only in development
    log:
      process.env.NODE_ENV === "production"
        ? ["warn", "error"]
        : ["query", "warn", "error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
