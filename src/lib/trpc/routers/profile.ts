import { router, protectedProcedure } from "../trpc"

export const profileRouter = router({
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.delete({ where: { id: ctx.user.id } })
    return { success: true }
  }),
})
