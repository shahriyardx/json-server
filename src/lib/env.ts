import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  server: {
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    DEEPSEEK_API_KEY: z.string().optional(),
    SELF_HOSTED: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    SELF_HOSTED: process.env.SELF_HOSTED,
  },
})
