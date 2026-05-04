"use client"

import { use } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  count: {
    label: "Requests",
    color: "var(--chart-1)",
  },
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ fileId: string }>
}) {
  const { fileId } = use(params)
  const { data: analytics, isPending } = trpc.analytics.getFileAnalytics.useQuery(
    { fileId },
  )

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Analytics not available</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      <Link
        href="/dashboard/my-jsons"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to My JSONs
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BarChart3 className="size-6" />
          Usage Analytics
        </h1>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Requests (30 days)</p>
          <p className="mt-1 text-3xl font-bold">{formatCompact(analytics.total30d)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Daily average</p>
          <p className="mt-1 text-3xl font-bold">{analytics.avgDaily}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Top referrer</p>
          <p className="mt-1 truncate text-lg font-semibold">
            {analytics.topReferrer ?? "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Requests over time
        </h2>
        {analytics.daily.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No request data yet. Share your JSON endpoint to get started.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={analytics.daily}>
              <CartesianGrid vertical={false} className="stroke-muted/50" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
