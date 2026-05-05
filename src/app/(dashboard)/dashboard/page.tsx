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

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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
    recentFiles,
    trashCount,
    versionCount,
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
    prisma.jsonFile.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, filename: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.jsonFile.count({ where: { userId, deletedAt: { not: null } } }),
    prisma.jsonFileVersion.count({ where: { jsonFile: { userId } } }),
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

  const requestCount = requestStats?.count ?? 0
  const fileLimit = 100
  const requestLimit = 100_000

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
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
                width: `${Math.min(
                  (requestCount / requestLimit) * 100,
                  100,
                )}%`,
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

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        <div className="border p-5 lg:col-span-2 min-w-0 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">Requests (Last 7 Days)</h2>
            <span className="text-2xl font-bold">
              {totalWeeklyRequests.toLocaleString()}
            </span>
          </div>
          <RequestChart data={chartData} />
        </div>
        <div className="space-y-4">
          <div className="border p-5">
            <p className="text-sm text-muted-foreground">Total Versions</p>
            <p className="mt-1 text-3xl font-bold">
              {versionCount.toLocaleString()}
            </p>
          </div>
          <div className="border p-5">
            <p className="text-sm text-muted-foreground">Trash</p>
            <Link
              href="/dashboard/trash"
              className="mt-1 block text-3xl font-bold hover:underline"
            >
              {trashCount}
            </Link>
          </div>
          <div className="border p-5">
            <p className="mb-2 text-sm text-muted-foreground">
              Storage by Type
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Arrays</span>
                <span className="font-medium">{arrayCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Objects</span>
                <span className="font-medium">{objectCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Primitives</span>
                <span className="font-medium">{primitiveCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent Files</h2>
          <Link
            href="/dashboard/json"
            className="text-sm text-muted-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        {recentFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          <div className="divide-y">
            {recentFiles.map((file) => (
              <Link
                key={file.id}
                href={`/dashboard/json/${file.id}/edit`}
                className="-mx-5 flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-accent/50"
              >
                <span className="truncate text-sm font-medium">
                  {file.filename}
                </span>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(file.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
