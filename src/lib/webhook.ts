import crypto from "node:crypto"

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
