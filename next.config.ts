import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    SELF_HOSTED: process.env.SELF_HOSTED || "false",
  },
}

export default nextConfig
