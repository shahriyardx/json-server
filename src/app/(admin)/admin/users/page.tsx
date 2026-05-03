import { prisma } from "@/lib/prisma"
import { UsersTable } from "./users-table"

export default async function AdminUsersPage() {
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
      <UsersTable users={users} />
    </div>
  )
}
