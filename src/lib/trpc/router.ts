import { router } from "./trpc"
import { uploadRouter } from "./routers/upload"
import { adminRouter } from "./routers/admin"

export const appRouter = router({
  upload: uploadRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
