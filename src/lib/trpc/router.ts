import { router } from "./trpc"
import { uploadRouter } from "./routers/upload"
import { adminRouter } from "./routers/admin"
import { profileRouter } from "./routers/profile"

export const appRouter = router({
  upload: uploadRouter,
  admin: adminRouter,
  profile: profileRouter,
})

export type AppRouter = typeof appRouter
