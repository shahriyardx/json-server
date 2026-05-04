"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface SizeChartProps {
  data: { date: string; size: number }[]
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(0)}KB`
}

export default function SizeChart({ data }: SizeChartProps) {
  return (
    <div className="rounded-lg border-2 p-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tickFormatter={formatBytes}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <Tooltip
            formatter={(value) => [formatBytes(Number(value)), "Size"]}
            labelFormatter={(label) => `Date: ${String(label)}`}
          />
          <Line
            type="monotone"
            dataKey="size"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
