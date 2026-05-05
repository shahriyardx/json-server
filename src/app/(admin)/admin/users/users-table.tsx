"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

type User = {
  id: string
  name: string
  email: string
  username?: string | null
  role: string
  banned: boolean | null
  banReason: string | null
  banExpires: Date | null
  createdAt: Date
}

export function UsersTable({
  users,
  onRefresh,
}: { users: User[]; onRefresh: () => void }) {
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id

  const [banReason, setBanReason] = useState("")
  const [banDays, setBanDays] = useState("")
  const [banTarget, setBanTarget] = useState<string | null>(null)

  const handleBan = async (userId: string) => {
    try {
      await authClient.admin.banUser({
        userId,
        banReason: banReason || undefined,
        banExpiresIn: banDays ? Number(banDays) * 86400 : undefined,
      })
      toast.success("User banned")
      setBanTarget(null)
      setBanReason("")
      setBanDays("")
      onRefresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to ban user")
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      await authClient.admin.unbanUser({ userId })
      toast.success("User unbanned")
      onRefresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to unban user")
    }
  }

  const handleImpersonate = async (userId: string) => {
    try {
      await authClient.admin.impersonateUser({ userId })
      toast.success("Impersonating user. Redirecting...")
      window.location.href = "/dashboard"
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to impersonate")
    }
  }

  return (
    <div className="mt-6 overflow-x-auto border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted text-left">
            <th className="px-4 py-2 font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-2 font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-2 font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-2 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2 font-medium text-muted-foreground">Joined</th>
            <th className="w-24 px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="px-4 py-2 whitespace-nowrap">
                <div>
                  <span>{u.name}</span>
                  {u.username && (
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      @{u.username}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-medium ${u.role === "admin" || u.role === "superadmin" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-2">
                {u.banned ? (
                  <span className="text-xs font-medium text-destructive">
                    Banned
                    {u.banReason && ` — ${u.banReason}`}
                    {u.banExpires &&
                      ` (until ${new Date(u.banExpires).toLocaleDateString()})`}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Active</span>
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1.5">
                  {/* Impersonate */}
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleImpersonate(u.id)}
                      className="text-xs underline hover:text-foreground"
                    >
                      Login as
                    </button>
                  )}

                  {/* Ban / Unban */}
                  {u.id !== currentUserId && u.role !== "superadmin" && (
                    <>
                      {u.banned ? (
                        <button
                          type="button"
                          onClick={() => handleUnban(u.id)}
                          className="text-xs underline hover:text-foreground"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBanTarget(u.id)}
                          className="text-xs text-destructive underline hover:text-destructive/80"
                        >
                          Ban
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Ban dialog */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="font-semibold">Ban User</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="ban-reason"
                  className="block text-xs text-muted-foreground"
                >
                  Reason
                </label>
                <input
                  id="ban-reason"
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Spamming, abuse, etc."
                  className="mt-1 w-full rounded border px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="ban-days"
                  className="block text-xs text-muted-foreground"
                >
                  Duration (days, leave empty for permanent)
                </label>
                <input
                  id="ban-days"
                  type="number"
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  placeholder="7"
                  className="mt-1 w-full rounded border px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBanTarget(null)
                  setBanReason("")
                  setBanDays("")
                }}
                className="rounded border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBan(banTarget)}
                className="rounded bg-destructive px-3 py-1.5 text-sm text-destructive-foreground"
              >
                Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
