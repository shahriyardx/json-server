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
        jsonContent: z.string().min(1, "JSON content is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
})
