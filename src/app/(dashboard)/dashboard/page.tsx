import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const userId = session?.user.id!
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [fileCount, requestStats, allFiles, apiKeyCount, privacyStats] =
    await Promise.all([
      prisma.jsonFile.count({ where: { userId } }),
      prisma.userMonthlyRequest.findUnique({
        where: { userId_month_year: { userId, month, year } },
      }),
      prisma.jsonFile.findMany({
        where: { userId },
        select: { content: true },
      }),
      prisma.apiKey.count({ where: { userId } }),
      prisma.jsonFile.groupBy({
        by: ["isPublic"],
        where: { userId },
        _count: true,
      }),
    ])

  const bytesUsed = allFiles.reduce(
    (sum, f) => sum + new TextEncoder().encode(f.content).length,
    0,
  )
  const storageLimit = 52_428_800 // 50MB

  const requestCount = requestStats?.count ?? 0
  const fileLimit = 100
  const requestLimit = 100_000

  const publicCount =
    privacyStats.find((s) => s.isPublic)?._count ?? 0
  const privateCount =
    privacyStats.find((s) => !s.isPublic)?._count ?? 0

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome, {session?.user.username || session?.user.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload JSON or manage existing files.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Files uploaded</p>
          <p className="mt-1 text-3xl font-bold">
            {fileCount} / {fileLimit}
          </p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{
                width: `${Math.min((fileCount / fileLimit) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {publicCount} public / {privateCount} private
          </p>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Storage used</p>
          <p className="mt-1 text-3xl font-bold">
            {bytesUsed < 1_048_576
              ? `${(bytesUsed / 1024).toFixed(0)}KB`
              : `${(bytesUsed / 1_048_576).toFixed(1)}MB`}{" "}
            / 50MB
          </p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{
                width: `${Math.min((bytesUsed / storageLimit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Requests this month</p>
          <p className="mt-1 text-3xl font-bold">
            {requestCount.toLocaleString()} / {requestLimit.toLocaleString()}
          </p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{
                width: `${Math.min((requestCount / requestLimit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">API Keys</p>
          <p className="mt-1 text-3xl font-bold">{apiKeyCount} / 10</p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{
                width: `${Math.min((apiKeyCount / 10) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
