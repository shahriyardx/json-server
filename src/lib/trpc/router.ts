import { router } from "./trpc"
import { uploadRouter } from "./routers/upload"
import { adminRouter } from "./routers/admin"
import { profileRouter } from "./routers/profile"
import { apiKeysRouter } from "./routers/api-keys"
import { versionsRouter } from "./routers/versions"
import { webhookRouter } from "./routers/webhooks"
import { analyticsRouter } from "./routers/analytics"
import { aiRouter } from "./routers/ai"

export const appRouter = router({
  upload: uploadRouter,
  admin: adminRouter,
  profile: profileRouter,
  apiKeys: apiKeysRouter,
  versions: versionsRouter,
  webhooks: webhookRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
})

export type AppRouter = typeof appRouter
