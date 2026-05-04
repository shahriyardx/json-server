import { createAuthClient } from "better-auth/react"
import type { auth } from "./auth.js"
import { inferAdditionalFields } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})
