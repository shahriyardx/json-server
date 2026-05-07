import { prisma } from "@/lib/prisma"

export async function logFileRequest(fileId: string, referer: string | null) {
  const now = new Date()
  const date = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  )
  const referrerDomain = referer
    ? new URL(referer).hostname.replace(/^www\./, "")
    : "direct"

  await prisma.fileRequestLog.upsert({
    where: { fileId_date: { fileId, date } },
    create: { fileId, date, count: 1, referrers: { [referrerDomain]: 1 } },
    update: { count: { increment: 1 } },
  })

  // Update referrers separately — JSON merge not supported in Prisma
  const current = await prisma.fileRequestLog.findUnique({
    where: { fileId_date: { fileId, date } },
    select: { referrers: true },
  })
  if (current) {
    const refs = (current.referrers ?? {}) as Record<string, number>
    refs[referrerDomain] = (refs[referrerDomain] ?? 0) + 1
    await prisma.fileRequestLog.update({
      where: { fileId_date: { fileId, date } },
      data: { referrers: refs },
    })
  }
}
