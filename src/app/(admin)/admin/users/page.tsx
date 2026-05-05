"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { UsersTable } from "./users-table"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const loadUsers = async () => {
    setLoaded(false)
    try {
      const res = await authClient.admin.listUsers({
        query: {},
      })
      if (res.data) {
        setUsers(res.data.users)
        setTotal(res.data.total)
      } else if (res.error) {
        toast.error(res.error.message ?? "Failed to load users")
      }
    } catch {
      toast.error("Failed to load users")
    }
    setLoaded(true)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} total users</p>

      <UsersTable users={users} onRefresh={() => loadUsers()} />
    </div>
  )
}
