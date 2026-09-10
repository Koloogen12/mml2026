// Prisma client — one instance per process.
// In dev, Next.js hot-reload re-imports this file many times; caching on
// globalThis prevents "too many connections" and "prepared statement already
// exists" errors during development.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
