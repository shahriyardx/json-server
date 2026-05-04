import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { generateApiKey } from "@/lib/api-key"

export const apiKeysRouter = router({
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.apiKey.findMany({
      where: { userId: ctx.user.id },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" },
    })
  }),

  createApiKey: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.prisma.apiKey.count({
        where: { userId: ctx.user.id },
      })
      if (count >= 10) {
        throw new Error("Maximum of 10 API keys reached.")
      }
      const { plainKey, keyHash } = generateApiKey()
      await ctx.prisma.apiKey.create({
        data: { userId: ctx.user.id, name: input.name, keyHash },
      })
      return { plainKey }
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await ctx.prisma.apiKey.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!key) throw new Error("API key not found")
      await ctx.prisma.apiKey.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
