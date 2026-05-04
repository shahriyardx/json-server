import { z } from "zod"
import { router, protectedProcedure } from "../trpc"

export const analyticsRouter = router({
  getFileAnalytics: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.fileId, userId: ctx.user.id, deletedAt: null },
        select: { id: true },
      })
      if (!file) throw new Error("File not found")

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      const start = new Date(Date.UTC(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate()))

      const logs = await ctx.prisma.fileRequestLog.findMany({
        where: {
          fileId: input.fileId,
          date: { gte: start },
        },
        orderBy: { date: "asc" },
        select: { date: true, count: true, referrers: true },
      })

      const daily = logs.map((l) => ({
        date: l.date.toISOString().slice(0, 10),
        count: l.count,
        referrers: l.referrers as Record<string, number> | null,
      }))

      const total30d = logs.reduce((s, l) => s + l.count, 0)
      const avgDaily = logs.length > 0 ? Math.round(total30d / logs.length) : 0

      // Aggregate referrers across all days
      const referrerTotals: Record<string, number> = {}
      for (const l of logs) {
        if (l.referrers) {
          const refs = l.referrers as Record<string, number>
          for (const [domain, count] of Object.entries(refs)) {
            referrerTotals[domain] = (referrerTotals[domain] ?? 0) + count
          }
        }
      }
      const topReferrer = Object.entries(referrerTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      return { daily, total30d, avgDaily, topReferrer }
    }),
})
