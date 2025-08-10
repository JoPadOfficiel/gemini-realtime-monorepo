import { PrismaClient } from "@prisma/client"
import "server-only";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient
}

// Use globalThis instead of global for Edge Runtime compatibility
const globalForPrisma = globalThis as unknown as {
  cachedPrisma: PrismaClient | undefined
}

export let prisma: PrismaClient
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  if (!globalForPrisma.cachedPrisma) {
    globalForPrisma.cachedPrisma = new PrismaClient()
  }
  prisma = globalForPrisma.cachedPrisma
}
