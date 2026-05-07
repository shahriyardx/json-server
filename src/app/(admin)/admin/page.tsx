import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Admin Panel",
}

export default async function AdminPage() {
  const [userCount, jsonCount, monthStats, allFiles] = await Promise.all([
    prisma.user.count(),
    prisma.jsonFile.count(),
    prisma.userMonthlyRequest.aggregate({ _sum: { count: true } }),
    prisma.jsonFile.findMany({ select: { content: true } }),
  ])

  const totalRequests = monthStats._sum.count ?? 0
  const bytesUsed = allFiles.reduce(
    (sum, f) => sum + new TextEncoder().encode(f.content).length,
    0,
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Platform-wide statistics
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="mt-1 text-3xl font-bold">{userCount}</p>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">JSON Files</p>
          <p className="mt-1 text-3xl font-bold">{jsonCount}</p>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Requests This Month</p>
          <p className="mt-1 text-3xl font-bold">
            {totalRequests.toLocaleString()}
          </p>
        </div>
        <div className="border p-5">
          <p className="text-sm text-muted-foreground">Storage Used</p>
          <p className="mt-1 text-3xl font-bold">
            {bytesUsed < 1_048_576
              ? `${(bytesUsed / 1024).toFixed(0)}KB`
              : `${(bytesUsed / 1_048_576).toFixed(1)}MB`}
          </p>
        </div>
      </div>
    </div>
  )
}
