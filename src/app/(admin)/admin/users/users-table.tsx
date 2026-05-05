"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MoreHorizontalIcon, UserIcon, BanIcon, ShieldCheckIcon, ShieldOffIcon } from "lucide-react"

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

  const banMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      toast.success("User banned")
      setBanTarget(null)
      setBanReason("")
      setBanDays("")
      onRefresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const unbanMutation = trpc.admin.unbanUser.useMutation({
    onSuccess: () => {
      toast.success("User unbanned")
      onRefresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const roleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated")
      onRefresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const isSuperAdmin = session?.user?.role === "superadmin"
  const isAdmin = session?.user?.role === "admin"

  const canImpersonate = (targetRole: string) =>
    isSuperAdmin || (isAdmin && targetRole === "user")

  const canBan = (targetRole: string) =>
    targetRole !== "superadmin" && (isSuperAdmin || (isAdmin && targetRole === "user"))

  const handleBan = (userId: string) => {
    banMutation.mutate({
      userId,
      banReason: banReason || undefined,
      banExpiresIn: banDays ? Number(banDays) * 86400 : undefined,
    })
  }

  const handleUnban = (userId: string) => {
    unbanMutation.mutate({ userId })
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
    <div className="mt-6 border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div>
                  <span>{u.name}</span>
                  {u.username && (
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      @{u.username}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <span
                  className={`text-xs font-medium ${u.role === "admin" || u.role === "superadmin" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {u.role}
                </span>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {u.id !== currentUserId && (canImpersonate(u.role) || canBan(u.role) || (isSuperAdmin && u.role !== "superadmin")) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        {canImpersonate(u.role) && (
                          <DropdownMenuItem onClick={() => handleImpersonate(u.id)}>
                            <UserIcon className="mr-2 size-4" />
                            Login as
                          </DropdownMenuItem>
                        )}
                        {isSuperAdmin && u.role !== "superadmin" && (
                          <DropdownMenuItem
                            onClick={() =>
                              roleMutation.mutate({
                                userId: u.id,
                                role: u.role === "admin" ? "user" : "admin",
                              })
                            }
                          >
                            {u.role === "admin" ? (
                              <>
                                <ShieldOffIcon className="mr-2 size-4" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <ShieldCheckIcon className="mr-2 size-4" />
                                Make Admin
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {canBan(u.role) && (
                          <DropdownMenuItem
                            onClick={() =>
                              u.banned ? handleUnban(u.id) : setBanTarget(u.id)
                            }
                          >
                            <BanIcon className="mr-2 size-4" />
                            {u.banned ? "Unban" : "Ban"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
              <Button variant="outline" onClick={() => {
                  setBanTarget(null)
                  setBanReason("")
                  setBanDays("")
                }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleBan(banTarget)} disabled={banMutation.isPending}>
                {banMutation.isPending ? "Banning..." : "Ban"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
