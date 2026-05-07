import { prisma } from "@/lib/prisma"
import { hashApiKey } from "@/lib/api-key"

export async function authenticateRequest(
  req: Request,
  ownerUserId: string,
): Promise<boolean> {
  const authHeader = req.headers.get("authorization")
  let apiKey: string | null = null

  if (authHeader?.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7)
  } else {
    const url = new URL(req.url)
    apiKey = url.searchParams.get("api_key")
  }

  if (!apiKey) return false

  const keyHash = hashApiKey(apiKey)
  const found = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { userId: true },
  })
  if (!found || found.userId !== ownerUserId) return false

  prisma.apiKey
    .update({
      where: { keyHash },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  return true
}
