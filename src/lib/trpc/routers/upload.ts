import { z } from "zod"
import { router, protectedProcedure } from "../trpc"

const MAX_FILE_SIZE = 1_048_576 // 1MB
const MAX_TOTAL_SIZE = 52_428_800 // 50MB

function bytes(str: string) {
  return new TextEncoder().encode(str).length
}

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

      const fileSize = bytes(input.jsonContent)
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error("File exceeds 1MB size limit.")
      }

      const allFiles = await ctx.prisma.jsonFile.findMany({
        where: { userId: ctx.user.id },
        select: { content: true },
      })
      const totalBytes = allFiles.reduce((sum, f) => sum + bytes(f.content), 0) + fileSize
      if (totalBytes > MAX_TOTAL_SIZE) {
        throw new Error("Total storage limit of 50MB exceeded.")
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
      select: { id: true, filename: true, createdAt: true, content: true },
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

      const newSize = bytes(input.jsonContent)
      if (newSize > MAX_FILE_SIZE) {
        throw new Error("File exceeds 1MB size limit.")
      }

      if (input.jsonContent !== existing.content) {
        const allOtherFiles = await ctx.prisma.jsonFile.findMany({
          where: { userId: ctx.user.id, id: { not: input.id } },
          select: { content: true },
        })
        const totalBytes = allOtherFiles.reduce((sum, f) => sum + bytes(f.content), 0) + newSize
        if (totalBytes > MAX_TOTAL_SIZE) {
          throw new Error("Total storage limit of 50MB exceeded.")
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
