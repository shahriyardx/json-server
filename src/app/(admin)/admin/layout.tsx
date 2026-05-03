import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

async function getAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  if (!session) redirect("/")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const adminCount = await prisma.user.count({
    where: { role: { in: ["admin", "superadmin"] } },
  })

  if (adminCount === 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "superadmin" },
    })
    return
  }

  if (user?.role !== "admin" && user?.role !== "superadmin") notFound()
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  await getAdmin(session)

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <span className="text-sm font-medium">Admin</span>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
