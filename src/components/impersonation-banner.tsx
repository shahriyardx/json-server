"use client"

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const { data: session } = authClient.useSession()
  const router = useRouter()

  if (!session?.session?.impersonatedBy) return null

  const handleStop = async () => {
    await authClient.admin.stopImpersonating()
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-2 bg-amber-500/10 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
      <span>
        Impersonating <strong>{session.user.name}</strong> — actions are logged.
      </span>
      <button
        type="button"
        onClick={handleStop}
        className="rounded border border-amber-500/30 px-2 py-0.5 text-xs font-medium hover:bg-amber-500/20"
      >
        Stop Impersonating
      </button>
    </div>
  )
}
