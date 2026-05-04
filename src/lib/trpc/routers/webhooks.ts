import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { generateWebhookSecret } from "@/lib/webhook"

export const webhookRouter = router({
  getWebhook: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.fileId, userId: ctx.user.id, deletedAt: null },
        select: { webhook: true },
      })
      if (!file) throw new Error("File not found")
      if (!file.webhook) return null

      return {
        id: file.webhook.id,
        url: file.webhook.url,
        secretMasked: `${file.webhook.secret.slice(0, 8)}...${file.webhook.secret.slice(-4)}`,
        enabled: file.webhook.enabled,
        lastDeliveryAt: file.webhook.lastDeliveryAt,
        lastDeliveryStatus: file.webhook.lastDeliveryStatus,
        lastDeliveryResponseCode: file.webhook.lastDeliveryResponseCode,
        createdAt: file.webhook.createdAt,
      }
    }),

  upsertWebhook: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        url: z.string().url("Must be a valid URL"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.jsonFile.findFirst({
        where: { id: input.fileId, userId: ctx.user.id, deletedAt: null },
      })
      if (!file) throw new Error("File not found")

      const secret = generateWebhookSecret()

      await ctx.prisma.webhook.upsert({
        where: { jsonFileId: input.fileId },
        create: {
          jsonFileId: input.fileId,
          url: input.url,
          secret,
        },
        update: {
          url: input.url,
          secret,
          enabled: true,
        },
      })

      return { secret }
    }),

  toggleWebhook: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const webhook = await ctx.prisma.webhook.findFirst({
        where: { jsonFileId: input.fileId, jsonFile: { userId: ctx.user.id } },
      })
      if (!webhook) throw new Error("No webhook configured for this file")

      const updated = await ctx.prisma.webhook.update({
        where: { id: webhook.id },
        data: { enabled: !webhook.enabled },
      })

      return { enabled: updated.enabled }
    }),

  regenerateSecret: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const webhook = await ctx.prisma.webhook.findFirst({
        where: { jsonFileId: input.fileId, jsonFile: { userId: ctx.user.id } },
      })
      if (!webhook) throw new Error("No webhook configured for this file")

      const secret = generateWebhookSecret()

      await ctx.prisma.webhook.update({
        where: { id: webhook.id },
        data: { secret },
      })

      return { secret }
    }),

  deleteWebhook: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const webhook = await ctx.prisma.webhook.findFirst({
        where: { jsonFileId: input.fileId, jsonFile: { userId: ctx.user.id } },
      })
      if (!webhook) throw new Error("No webhook configured for this file")

      await ctx.prisma.webhook.delete({ where: { id: webhook.id } })
      return { success: true }
    }),
})
