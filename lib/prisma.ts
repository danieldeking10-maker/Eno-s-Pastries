import { PrismaClient } from '@prisma/client'

// Fallback PostgreSQL URL for serverless environments when DATABASE_URL is not yet configured or is SQLite
const FALLBACK_POSTGRES_URL =
  'postgresql://postgres.vfolwsqdizcnmpowptko:postgres@db.vfolwsqdizcnmpowptko.supabase.co:5432/postgres?sslmode=require'

/**
 * Normalizes DATABASE_URL to guarantee a valid PostgreSQL connection string.
 * Prevents fatal Prisma engine datasource validation crashes in serverless runtimes.
 */
function normalizeDatabaseUrl(): string {
  const rawUrl = (process.env.DATABASE_URL || '').replace(/['"\r\n\s]/g, '').trim()
  if (rawUrl && (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://'))) {
    return rawUrl
  }
  return FALLBACK_POSTGRES_URL
}

if (!process.env.DATABASE_URL || (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://'))) {
  process.env.DATABASE_URL = normalizeDatabaseUrl()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: normalizeDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function isDatabaseConfigured(): boolean {
  const url = (process.env.DATABASE_URL || '').trim()
  return (url.startsWith('postgresql://') || url.startsWith('postgres://')) && !url.includes('localhost')
}

export default prisma