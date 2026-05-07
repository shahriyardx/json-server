"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Trash2Icon } from "lucide-react"

export default function SettingsPage() {
  const { push } = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const utils = trpc.useUtils()
  const updateMutation = trpc.profile.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved")
    },
    onError: (err) => toast.error(err.message),
  })
  const deleteMutation = trpc.profile.deleteAccount.useMutation()

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
  }, [session])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session?.user) return null

  const user = session.user

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty")
    setSaving(true)
    try {
      await updateMutation.mutateAsync({ name: name.trim() })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteMutation.mutateAsync()
      await authClient.signOut()
      push("/")
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 py-8">
      {/* Avatar & Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image || ""} alt={user.name || ""} />
              <AvatarFallback className="text-lg">
                {(user.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm">
                Signed in with <span className="font-medium">GitHub</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Avatar sourced from GitHub
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {user.username || "Not set"}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {user.email}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving || name === user.name}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardFooter className="px-6 pb-6 pt-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2Icon className="size-4" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all associated
                  data — including all your JSON files, API usage records, and
                  account information. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-6">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  variant="destructive"
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  )
}
