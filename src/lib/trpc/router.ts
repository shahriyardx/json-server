import { router } from "./trpc"
import { uploadRouter } from "./routers/upload"
import { adminRouter } from "./routers/admin"
import { profileRouter } from "./routers/profile"
import { apiKeysRouter } from "./routers/api-keys"
import { versionsRouter } from "./routers/versions"

export const appRouter = router({
  upload: uploadRouter,
  admin: adminRouter,
  profile: profileRouter,
  apiKeys: apiKeysRouter,
  versions: versionsRouter,
})

export type AppRouter = typeof appRouter
