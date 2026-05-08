import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { env } from "@/lib/env"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect(env.SELF_HOSTED === "true" ? "/login" : "/")
  }

  return <>{children}</>
}
