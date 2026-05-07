import { prisma } from "@/lib/prisma"
import { fireWebhook } from "@/lib/webhook"

export interface JsonFileWithOwner {
  id: string
  userId: string
  filename: string
  content: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  owner: {
    id: string
    role: string
    banned: boolean
  }
}

export async function getJsonFile(
  username: string,
  filename: string,
): Promise<JsonFileWithOwner | null> {
  const user = await prisma.user.findFirst({
    where: { username },
    select: { id: true, role: true, banned: true },
  })
  if (!user || user.banned) return null

  const file = await prisma.jsonFile.findFirst({
    where: { userId: user.id, filename, deletedAt: null },
  })
  if (!file) return null

  return { ...file, owner: user }
}

export async function updateFileContent(
  fileId: string,
  content: string,
  filename: string,
  isPublic: boolean,
) {
  await prisma.jsonFile.update({
    where: { id: fileId },
    data: { content },
  })

  fireWebhook(prisma, fileId, filename, content, isPublic).catch(() => {})
}
