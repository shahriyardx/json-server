import crypto from "node:crypto"
import type { PrismaClient } from "@/generated/prisma/client"

export function generateWebhookSecret(): string {
  return `wh_${crypto.randomBytes(24).toString("hex")}`
}

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

interface DeliveryResult {
  status: "success" | "failure"
  responseCode: number | null
  error?: string
}

export async function deliverWebhook(
  url: string,
  secret: string,
  payload: object,
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload)
  const signature = signPayload(body, secret)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": "file.updated",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })

    return {
      status: response.ok ? "success" : "failure",
      responseCode: response.status,
    }
  } catch (err) {
    return {
      status: "failure",
      responseCode: null,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export async function fireWebhook(
  prisma: PrismaClient,
  fileId: string,
  filename: string,
  content: string,
  isPublic: boolean,
) {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { jsonFileId: fileId },
    })
    if (!webhook || !webhook.enabled) return

    const result = await deliverWebhook(webhook.url, webhook.secret, {
      event: "file.updated",
      file: {
        id: fileId,
        filename,
        content,
        isPublic,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: result.status,
        lastDeliveryResponseCode: result.responseCode,
      },
    })
  } catch {
    // Silently fail — webhook delivery errors must not break the mutation
  }
}
