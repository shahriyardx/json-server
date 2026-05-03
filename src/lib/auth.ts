import { prismaAdapter } from "better-auth/adapters/prisma"

import { nextCookies } from "better-auth/next-js"
import { betterAuth } from "better-auth"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  appName: "json-server",
  plugins: [nextCookies()],
})
