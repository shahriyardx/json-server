import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { enforceVersionLimit } from "./versions"
import { fireWebhook } from "@/lib/webhook"

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
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin =
        ctx.user?.role === "admin" || ctx.user?.role === "superadmin"

      if (!isAdmin) {
        const count = await ctx.prisma.jsonFile.count({
          where: { userId: ctx.user.id, deletedAt: null },
        })
        if (count >= 100) {
          throw new Error("Limit reached. You can upload up to 100 JSON files.")
        }
      }

      const duplicate = await ctx.prisma.jsonFile.findFirst({
        where: {
          userId: ctx.user.id,
          filename: input.filename,
          deletedAt: null,
        },
      })
      if (duplicate) {
        throw new Error("A file with this filename already exists.")
      }

      const fileSize = bytes(input.jsonContent)
      if (!isAdmin && fileSize > MAX_FILE_SIZE) {
        throw new Error("File exceeds 1MB size limit.")
      }

      if (!isAdmin) {
        const allFiles = await ctx.prisma.jsonFile.findMany({
          where: { userId: ctx.user.id, deletedAt: null },
          select: { content: true },
        })
        const totalBytes =
          allFiles.reduce((sum, f) => sum + bytes(f.content), 0) + fileSize
        if (totalBytes > MAX_TOTAL_SIZE) {
          throw new Error("Total storage limit of 50MB exceeded.")
        }
      }

      const jsonFile = await ctx.prisma.jsonFile.create({
        data: {
          userId: ctx.user.id,
          filename: input.filename,
          content: input.jsonContent,
          isPublic: input.isPublic ?? true,
        },
      })
      return { id: jsonFile.id, filename: jsonFile.filename }
    }),
  getMyJsons: protectedProcedure.query(async ({ ctx }) => {
    const files = await ctx.prisma.jsonFile.findMany({
      where: { userId: ctx.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        content: true,
        isPublic: true,
      },
    })
    return files
  }),
  getJson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: null },
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
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: null },
      })
      if (!existing) throw new Error("File not found")

      if (input.filename !== existing.filename) {
        const duplicate = await ctx.prisma.jsonFile.findFirst({
          where: {
            userId: ctx.user.id,
            filename: input.filename,
            deletedAt: null,
          },
        })
        if (duplicate) {
          throw new Error("A file with this filename already exists.")
        }
      }

      const isAdmin =
        ctx.user?.role === "admin" || ctx.user?.role === "superadmin"

      const newSize = bytes(input.jsonContent)
      if (!isAdmin && newSize > MAX_FILE_SIZE) {
        throw new Error("File exceeds 1MB size limit.")
      }

      if (input.jsonContent !== existing.content) {
        if (!isAdmin) {
          const allOtherFiles = await ctx.prisma.jsonFile.findMany({
            where: {
              userId: ctx.user.id,
              id: { not: input.id },
              deletedAt: null,
            },
            select: { content: true },
          })
          const totalBytes =
            allOtherFiles.reduce((sum, f) => sum + bytes(f.content), 0) +
            newSize
          if (totalBytes > MAX_TOTAL_SIZE) {
            throw new Error("Total storage limit of 50MB exceeded.")
          }
        }
        // Save previous content as version
        await ctx.prisma.jsonFileVersion.create({
          data: { jsonFileId: input.id, content: existing.content },
        })
        await enforceVersionLimit(ctx.prisma, input.id)
      }

      const jsonFile = await ctx.prisma.jsonFile.update({
        where: { id: input.id },
        data: {
          filename: input.filename,
          content: input.jsonContent,
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        },
      })

      // Fire webhook asynchronously if configured and content changed
      if (input.jsonContent !== existing.content) {
        fireWebhook(
          ctx.prisma,
          jsonFile.id,
          jsonFile.filename,
          jsonFile.content,
          jsonFile.isPublic,
        )
      }

      return { id: jsonFile.id, filename: jsonFile.filename }
    }),
  deleteJson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: null },
      })
      if (!file) throw new Error("File not found")

      await ctx.prisma.jsonFile.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })
      return { success: true }
    }),
  toggleFileVisibility: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: null },
      })
      if (!file) throw new Error("File not found")
      const updated = await ctx.prisma.jsonFile.update({
        where: { id: input.id },
        data: { isPublic: !file.isPublic },
      })
      return { isPublic: updated.isPublic }
    }),
  searchJsons: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const files = await ctx.prisma.jsonFile.findMany({
        where: {
          userId: ctx.user.id,
          deletedAt: null,
          OR: [
            { filename: { contains: input.query, mode: "insensitive" } },
            { content: { contains: input.query, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          filename: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          content: true,
        },
      })
      return files
    }),
  trashFiles: protectedProcedure.query(async ({ ctx }) => {
    const files = await ctx.prisma.jsonFile.findMany({
      where: { userId: ctx.user.id, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        content: true,
        isPublic: true,
      },
    })
    return files
  }),
  restoreFile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: { not: null } },
      })
      if (!file) throw new Error("File not found in trash")

      const conflict = await ctx.prisma.jsonFile.findFirst({
        where: {
          userId: ctx.user.id,
          filename: file.filename,
          deletedAt: null,
        },
      })
      if (conflict) {
        throw new Error(
          `A file named "${file.filename}" already exists. Rename or delete it first.`,
        )
      }

      await ctx.prisma.jsonFile.update({
        where: { id: input.id },
        data: { deletedAt: null },
      })
      return { success: true }
    }),
  permanentDeleteFile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: { not: null } },
      })
      if (!file) throw new Error("File not found in trash")

      await ctx.prisma.jsonFile.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
