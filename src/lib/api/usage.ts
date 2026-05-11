import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"

export const MONTHLY_LIMIT = 100_000

export const rateLimiter = rateLimit({ interval: 60_000, max: 60 })

export async function checkAndIncrementRequest(
  userId: string,
): Promise<boolean> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const stats = await prisma.userMonthlyRequest.upsert({
    where: { userId_month_year: { userId, month, year } },
    create: { userId, month, year, count: 1 },
    update: { count: { increment: 1 } },
  })

  return stats.count <= MONTHLY_LIMIT
}

export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "superadmin"
}

const MAX_TOTAL_BYTES = 52_428_800 // 50MB

export async function checkStorageLimit(userId: string): Promise<boolean> {
  const [allFiles, allDocs] = await Promise.all([
    prisma.jsonFile.findMany({
      where: { userId },
      select: { content: true },
    }),
    prisma.document.findMany({
      where: { collection: { database: { userId } } },
      select: { data: true },
    }),
  ])

  const totalBytes =
    allFiles.reduce((sum, f) => sum + new TextEncoder().encode(f.content).length, 0) +
    allDocs.reduce((sum, d) => sum + new TextEncoder().encode(d.data).length, 0)

  return totalBytes <= MAX_TOTAL_BYTES
}
