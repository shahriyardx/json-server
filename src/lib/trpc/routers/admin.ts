import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"

export const adminRouter = router({
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { role: true },
      })
      if (caller?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      })
      return { success: true }
    }),
})
