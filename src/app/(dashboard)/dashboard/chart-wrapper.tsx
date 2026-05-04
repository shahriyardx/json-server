"use client"

import dynamic from "next/dynamic"

const RequestChart = dynamic(
  () => import("./request-chart").then((m) => ({ default: m.RequestChart })),
  { ssr: false },
)

export { RequestChart }
