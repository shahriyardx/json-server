import { prismaAdapter } from "better-auth/adapters/prisma"

import { nextCookies } from "better-auth/next-js"
import { betterAuth } from "better-auth"
import { prisma } from "./prisma"
import { env } from "./env"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  appName: "json-server",
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          const count = await prisma.user.count()
          if (count === 0) {
            return { data: { ...user, role: "superadmin" } }
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        username: profile.login,
      }),
    },
  },
})
