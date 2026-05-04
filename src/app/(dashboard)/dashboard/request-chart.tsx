"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  requests: { label: "Requests", color: "var(--chart-1)" },
}

export function RequestChart({
  data,
}: {
  data: { date: string; requests: number }[]
}) {
  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="requests"
          fill="var(--color-requests)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
