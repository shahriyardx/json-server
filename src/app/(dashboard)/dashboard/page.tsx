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

  const [fileCount, requestStats, allFiles] = await Promise.all([
    prisma.jsonFile.count({ where: { userId } }),
    prisma.userMonthlyRequest.findUnique({
      where: { userId_month_year: { userId, month, year } },
    }),
    prisma.jsonFile.findMany({ where: { userId }, select: { content: true } }),
  ])

  const bytesUsed = allFiles.reduce((sum, f) => sum + new TextEncoder().encode(f.content).length, 0)
  const storageLimit = 52_428_800 // 50MB

  const requestCount = requestStats?.count ?? 0
  const fileLimit = 100
  const requestLimit = 100_000

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome, {session?.user.username || session?.user.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload JSON or manage existing files.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Files uploaded</p>
          <p className="mt-1 text-3xl font-bold">{fileCount} / 100</p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${Math.min((fileCount / 100) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Storage used</p>
          <p className="mt-1 text-3xl font-bold">{bytesUsed < 1_048_576 ? `${(bytesUsed / 1024).toFixed(0)}KB` : `${(bytesUsed / 1_048_576).toFixed(1)}MB`} / 50MB</p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${Math.min((bytesUsed / storageLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Requests this month</p>
          <p className="mt-1 text-3xl font-bold">{requestCount.toLocaleString()} / 100,000</p>
          <div className="mt-3 h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${Math.min((requestCount / 100_000) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
