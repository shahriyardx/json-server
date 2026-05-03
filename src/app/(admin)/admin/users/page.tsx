import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { UsersTable } from "./users-table"

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
    : null

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      _count: { select: { jsonFiles: true } },
    },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">{users.length} total users</p>
      <UsersTable users={users} currentUserId={currentUser?.id} currentUserRole={currentUser?.role} />
    </div>
  )
}
