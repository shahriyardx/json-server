import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16">
      <p className="text-2xl font-bold tracking-tight">
        Welcome, {session?.user.username || session?.user.name}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload JSON or manage existing files.
      </p>
    </div>
  )
}
