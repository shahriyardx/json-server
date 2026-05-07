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
      if (caller?.role !== "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      if (input.userId === ctx.user.id) {
        throw new Error("Cannot change your own role.")
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      })
      return { success: true }
    }),
  resignAdmin: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { role: true },
    })
    if (user?.role !== "admin" && user?.role !== "superadmin") {
      throw new TRPCError({ code: "FORBIDDEN" })
    }

    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { role: "user" },
    })
    return { success: true }
  }),
  banUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        banReason: z.string().optional(),
        banExpiresIn: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { role: true },
      })
      if (
        !caller ||
        (caller.role !== "admin" && caller.role !== "superadmin")
      ) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      })
      if (!target) throw new TRPCError({ code: "NOT_FOUND" })
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot ban yourself",
        })
      }
      if (caller.role === "admin" && target.role !== "user") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot ban admin or superadmin",
        })
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          banned: true,
          banReason: input.banReason,
          banExpires: input.banExpiresIn
            ? new Date(Date.now() + input.banExpiresIn * 1000)
            : null,
        },
      })
      return { success: true }
    }),
  unbanUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { role: true },
      })
      if (
        !caller ||
        (caller.role !== "admin" && caller.role !== "superadmin")
      ) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      })
      if (!target) throw new TRPCError({ code: "NOT_FOUND" })
      if (caller.role === "admin" && target.role !== "user") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot unban admin or superadmin",
        })
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { banned: false, banReason: null, banExpires: null },
      })
      return { success: true }
    }),
})
