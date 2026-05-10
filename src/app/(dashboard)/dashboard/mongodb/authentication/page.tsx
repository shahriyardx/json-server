"use client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, Plus, UserX, Users as UsersIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"

export default function AuthenticationPage() {
  const utils = trpc.useUtils()
  const { data: users, isPending } = trpc.mongo.listUsers.useQuery()

  const [newUserOpen, setNewUserOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const createUser = trpc.mongo.createUser.useMutation({
    onSuccess: () => {
      utils.mongo.listUsers.invalidate()
      setNewUserOpen(false)
      setNewUsername("")
      setNewPassword("")
      toast.success("User created")
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteUser = trpc.mongo.deleteUser.useMutation({
    onSuccess: () => {
      utils.mongo.listUsers.invalidate()
      setDeleteTarget(null)
      toast.success("User deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="p-5">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Authentication</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cluster-level auth users. Each user can connect to any database
            within this account using Basic auth.
          </p>
        </div>
        <Button size="sm" onClick={() => setNewUserOpen(true)}>
          <Plus className="mr-1 size-3.5" />
          Add User
        </Button>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !users?.length ? (
        <div className="flex flex-col items-center justify-center py-16">
          <UsersIcon className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No users yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a user to enable Basic auth access to all your databases.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(u.id)}
                    >
                      <UserX className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create user dialog */}
      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add cluster user</DialogTitle>
            <DialogDescription>
              Create a username and password for Basic auth access to all your
              databases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="dbuser"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min 4 characters"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewUserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createUser.mutate({
                  username: newUsername,
                  password: newPassword,
                })
              }
              disabled={createUser.isPending || !newUsername || newPassword.length < 4}
            >
              {createUser.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete user dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Remove this user? They will no longer be able to authenticate to
              any database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteUser.mutate({ id: deleteTarget })
              }}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
