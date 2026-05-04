import { z } from "zod"
import { router, protectedProcedure } from "../trpc"

async function enforceVersionLimit(prisma: any, fileId: string) {
  const count = await prisma.jsonFileVersion.count({
    where: { jsonFileId: fileId },
  })
  if (count > 50) {
    const excess = count - 50
    const oldest = await prisma.jsonFileVersion.findMany({
      where: { jsonFileId: fileId },
      orderBy: { createdAt: "asc" },
      take: excess,
      select: { id: true },
    })
    await prisma.jsonFileVersion.deleteMany({
      where: { id: { in: oldest.map((v: any) => v.id) } },
    })
  }
}

export { enforceVersionLimit }

export const versionsRouter = router({
  getFileVersions: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.fileId, userId: ctx.user.id },
      })
      if (!file) throw new Error("File not found")
      return ctx.prisma.jsonFileVersion.findMany({
        where: { jsonFileId: input.fileId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    }),

  revertToVersion: protectedProcedure
    .input(z.object({ fileId: z.string(), versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.fileId, userId: ctx.user.id },
      })
      if (!file) throw new Error("File not found")
      const version = await ctx.prisma.jsonFileVersion.findFirst({
        where: { id: input.versionId, jsonFileId: input.fileId },
      })
      if (!version) throw new Error("Version not found")
      // Save current content as version before revert
      await ctx.prisma.jsonFileVersion.create({
        data: { jsonFileId: input.fileId, content: file.content },
      })
      await ctx.prisma.jsonFile.update({
        where: { id: input.fileId },
        data: { content: version.content },
      })
      await enforceVersionLimit(ctx.prisma, input.fileId)
      return { success: true }
    }),
})
