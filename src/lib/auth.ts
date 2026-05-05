import { prismaAdapter } from "better-auth/adapters/prisma"

import { nextCookies } from "better-auth/next-js"
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access"
import { prisma } from "./prisma"
import { env } from "./env"

const ac = createAccessControl({
  ...defaultStatements,
})

const adminRole = ac.newRole({
  user: ["create", "list", "impersonate", "get", "update"],
  session: ["list", "revoke", "delete"],
})

const superadminRole = ac.newRole({
  user: [...adminAc.statements.user, "impersonate-admins"],
  session: adminAc.statements.session,
})

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  appName: "json-server",
  plugins: [
    nextCookies(),
    admin({
      ac,
      roles: {
        admin: adminRole,
        superadmin: superadminRole,
      },
      adminRoles: ["admin", "superadmin"],
    }),
  ],
  onAPIError: {
    errorURL: "/",
  },
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
