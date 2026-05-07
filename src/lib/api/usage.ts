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
