import { z } from "zod"
import { router, protectedProcedure } from "../trpc"

export const profileRouter = router({
  updateSettings: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { name: input.name },
      })
      return { success: true }
    }),
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.delete({ where: { id: ctx.user.id } })
    return { success: true }
  }),
})
