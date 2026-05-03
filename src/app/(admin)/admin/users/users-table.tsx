"use client"

import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type User = {
  id: string
  name: string
  email: string
  username: string | null
  role: string
  createdAt: Date
  _count: { jsonFiles: number }
}

export function UsersTable({
  users,
  currentUserId,
  currentUserRole,
}: {
  users: User[]
  currentUserId?: string
  currentUserRole?: string
}) {
  const router = useRouter()
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })
  const resign = trpc.admin.resignAdmin.useMutation({
    onSuccess: () => {
      toast.success("Resigned as admin")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mt-6 overflow-x-auto border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted text-left">
            <th className="px-4 py-2 font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-2 font-medium text-muted-foreground">
              Username
            </th>
            <th className="px-4 py-2 font-medium text-muted-foreground">
              Email
            </th>
            <th className="px-4 py-2 font-medium text-muted-foreground">
              Role
            </th>
            <th className="px-4 py-2 font-medium text-muted-foreground">
              Files
            </th>
            <th className="px-4 py-2 font-medium text-muted-foreground">
              Joined
            </th>
            <th className="w-24 px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="px-4 py-2 whitespace-nowrap">{u.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                {u.username ?? "—"}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-medium ${u.role === "admin" || u.role === "superadmin" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {u._count.jsonFiles}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">
                {currentUserRole === "superadmin" ? (
                  u.id === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => resign.mutate()}
                      disabled={resign.isPending}
                      className="text-xs text-destructive underline hover:text-destructive/80 disabled:opacity-50"
                    >
                      Resign
                    </button>
                  ) : u.role === "admin" ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateRole.mutate({ userId: u.id, role: "user" })
                      }
                      disabled={updateRole.isPending}
                      className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                    >
                      Remove admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateRole.mutate({ userId: u.id, role: "admin" })
                      }
                      disabled={updateRole.isPending}
                      className="text-xs text-foreground underline hover:text-foreground disabled:opacity-50"
                    >
                      Make admin
                    </button>
                  )
                ) : currentUserRole === "admin" && u.id === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => resign.mutate()}
                    disabled={resign.isPending}
                    className="text-xs text-destructive underline hover:text-destructive/80 disabled:opacity-50"
                  >
                    Resign
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
