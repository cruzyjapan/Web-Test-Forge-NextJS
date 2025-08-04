import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use DATABASE_URL from environment or default to local SQLite
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

// Configure Prisma based on environment
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? (['query', 'error', 'warn'] as any)
    : (['error'] as any),
  datasources: {
    db: {
      url: databaseUrl
    }
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions)

// Only cache the client in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}