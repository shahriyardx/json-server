import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { FileText, Upload, Key, Trash2 } from "lucide-react"
import { RequestChart } from "./chart-wrapper"

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

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    fileCount,
    requestStats,
    allFiles,
    apiKeyCount,
    privacyStats,
    requestLogs,
    trashCount,
    versionCount,
    aiGenerationCount,
  ] = await Promise.all([
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
    prisma.fileRequestLog.findMany({
      where: { file: { userId }, date: { gte: sevenDaysAgo } },
      select: { date: true, count: true },
    }),
    prisma.jsonFile.count({ where: { userId, deletedAt: { not: null } } }),
    prisma.jsonFileVersion.count({ where: { jsonFile: { userId } } }),
    prisma.userMonthlyAiGeneration.findUnique({
      where: { userId_month_year: { userId, month, year } },
      select: { count: true },
    }),
  ])

  // 7-day chart data
  const dailyMap = new Map<string, number>()
  for (const log of requestLogs) {
    const key = log.date.toISOString().split("T")[0]
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + log.count)
  }
  const chartData: { date: string; requests: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    const label = new Date(key + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "numeric",
      day: "numeric",
    })
    chartData.push({ date: label, requests: dailyMap.get(key) ?? 0 })
  }
  const totalWeeklyRequests = chartData.reduce((s, d) => s + d.requests, 0)

  // Storage
  const bytesUsed = allFiles.reduce(
    (sum, f) => sum + new TextEncoder().encode(f.content).length,
    0,
  )
  const storageLimit = 52_428_800

  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "superadmin"

  const requestCount = requestStats?.count ?? 0
  const fileLimit = isAdmin ? Infinity : 100
  const requestLimit = isAdmin ? Infinity : 100_000
  const apiKeyLimit = isAdmin ? Infinity : 10
  const aiLimit = isAdmin ? Infinity : 30
  const aiCount = aiGenerationCount?.count ?? 0

  const publicCount = privacyStats.find((s) => s.isPublic)?._count ?? 0
  const privateCount = privacyStats.find((s) => !s.isPublic)?._count ?? 0

  // Type breakdown
  let arrayCount = 0
  let objectCount = 0
  let primitiveCount = 0
  for (const file of allFiles) {
    try {
      const parsed = JSON.parse(file.content)
      if (Array.isArray(parsed)) arrayCount++
      else if (typeof parsed === "object" && parsed !== null) objectCount++
      else primitiveCount++
    } catch {
      primitiveCount++
    }
  }

  return (
    <div className="space-y-8 p-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {session?.user.username || session?.user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload JSON or manage existing files.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/json/upload"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Upload className="h-4 w-4" /> Upload New
        </Link>
        <Link
          href="/dashboard/json"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <FileText className="h-4 w-4" /> JSON Files
        </Link>
        <Link
          href="/dashboard/api-keys"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Key className="h-4 w-4" /> API Keys
        </Link>
        <Link
          href="/dashboard/trash"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Trash2 className="h-4 w-4" /> Trash ({trashCount})
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Files uploaded</p>
          <p className="mt-1 text-3xl font-bold">
            {fileCount}
            <span className="text-muted-foreground">
              {" "}
              / {isAdmin ? "∞" : fileLimit}
            </span>
          </p>
          {!isAdmin && (
            <div className="mt-3 h-1.5 bg-border">
              <div
                className="h-full bg-foreground transition-all"
                style={{
                  width: `${Math.min((fileCount / fileLimit) * 100, 100)}%`,
                }}
              />
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {publicCount} public / {privateCount} private
          </p>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Storage used</p>
          <p className="mt-1 text-3xl font-bold">
            {bytesUsed < 1_048_576
              ? `${(bytesUsed / 1024).toFixed(0)}KB`
              : `${(bytesUsed / 1_048_576).toFixed(1)}MB`}
            <span className="text-muted-foreground">
              {" "}
              / {isAdmin ? "∞" : "50MB"}
            </span>
          </p>
          {!isAdmin && (
            <div className="mt-3 h-1.5 bg-border">
              <div
                className="h-full bg-foreground transition-all"
                style={{
                  width: `${Math.min((bytesUsed / storageLimit) * 100, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Requests this month</p>
          <p className="mt-1 text-3xl font-bold">
            {requestCount.toLocaleString()}
            <span className="text-muted-foreground">
              {" "}
              / {isAdmin ? "∞" : requestLimit.toLocaleString()}
            </span>
          </p>
          {!isAdmin && (
            <div className="mt-3 h-1.5 bg-border">
              <div
                className="h-full bg-foreground transition-all"
                style={{
                  width: `${Math.min(
                    (requestCount / requestLimit) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">AI Generations</p>
          <p className="mt-1 text-3xl font-bold">
            {aiCount}
            <span className="text-muted-foreground">
              {" "}
              / {isAdmin ? "∞" : aiLimit}
            </span>
          </p>
          {!isAdmin && (
            <div className="mt-3 h-1.5 bg-border">
              <div
                className="h-full bg-foreground transition-all"
                style={{
                  width: `${Math.min((aiCount / aiLimit) * 100, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="border p-5 min-w-0 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium">Requests (Last 7 Days)</h2>
          <span className="text-2xl font-bold">
            {totalWeeklyRequests.toLocaleString()}
          </span>
        </div>
        <RequestChart data={chartData} />
      </div>
    </div>
  )
}
