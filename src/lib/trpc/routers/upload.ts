import { z } from "zod"
import { router, protectedProcedure } from "../trpc"

export const uploadRouter = router({
  uploadJson: protectedProcedure
    .input(
      z.object({
        filename: z
          .string()
          .min(1, "Filename is required")
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Only letters, numbers, dashes, and underscores allowed",
          ),
        jsonContent: z
          .string()
          .min(1, "JSON content is required")
          .refine(
            (val) => {
              try {
                JSON.parse(val)
                return true
              } catch {
                return false
              }
            },
            { message: "Content must be valid JSON" },
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.prisma.jsonFile.count({
        where: { userId: ctx.user.id },
      })
      if (count >= 100) {
        throw new Error("Limit reached. You can upload up to 100 JSON files.")
      }

      const duplicate = await ctx.prisma.jsonFile.findUnique({
        where: { userId_filename: { userId: ctx.user.id, filename: input.filename } },
      })
      if (duplicate) {
        throw new Error("A file with this filename already exists.")
      }

      const jsonFile = await ctx.prisma.jsonFile.create({
        data: {
          userId: ctx.user.id,
          filename: input.filename,
          content: input.jsonContent,
        },
      })
      return { id: jsonFile.id, filename: jsonFile.filename }
    }),
  getMyJsons: protectedProcedure.query(async ({ ctx }) => {
    const files = await ctx.prisma.jsonFile.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, createdAt: true },
    })
    return files
  }),
  getJson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!file) throw new Error("File not found")
      return file
    }),
  updateJson: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        filename: z
          .string()
          .min(1, "Filename is required")
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Only letters, numbers, dashes, and underscores allowed",
          ),
        jsonContent: z
          .string()
          .min(1, "JSON content is required")
          .refine(
            (val) => {
              try {
                JSON.parse(val)
                return true
              } catch {
                return false
              }
            },
            { message: "Content must be valid JSON" },
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new Error("File not found")

      if (input.filename !== existing.filename) {
        const duplicate = await ctx.prisma.jsonFile.findUnique({
          where: { userId_filename: { userId: ctx.user.id, filename: input.filename } },
        })
        if (duplicate) {
          throw new Error("A file with this filename already exists.")
        }
      }

      const jsonFile = await ctx.prisma.jsonFile.update({
        where: { id: input.id },
        data: {
          filename: input.filename,
          content: input.jsonContent,
        },
      })
      return { id: jsonFile.id, filename: jsonFile.filename }
    }),
  deleteJson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!file) throw new Error("File not found")

      await ctx.prisma.jsonFile.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
