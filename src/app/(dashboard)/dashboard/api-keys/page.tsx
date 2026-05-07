"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field"
import { Copy, Trash2, KeyRound, Check } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

export default function ApiKeysPage() {
  const { data: keys, isPending } = trpc.apiKeys.listApiKeys.useQuery()
  const utils = trpc.useUtils()
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const createMutation = trpc.apiKeys.createApiKey.useMutation({
    onSuccess: (data) => {
      setShowNewKey(data.plainKey)
      setCreateOpen(false)
      utils.apiKeys.listApiKeys.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const revokeMutation = trpc.apiKeys.revokeApiKey.useMutation({
    onSuccess: () => {
      utils.apiKeys.listApiKeys.invalidate()
      toast.success("API key revoked")
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<{ name: string }>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  })

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    setCopied(true)
    toast.success("API key copied")
    setTimeout(() => setCopied(false), 2000)
  }

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage keys for programmatic access to your JSON files
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Give your key a name to remember what it's for.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((data) =>
                createMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <Field>
                <FieldLabel htmlFor="key-name">Key Name</FieldLabel>
                <Input
                  id="key-name"
                  placeholder="e.g. Production"
                  {...form.register("name")}
                  aria-invalid={!!form.formState.errors.name}
                />
                {form.formState.errors.name && (
                  <FieldError errors={[form.formState.errors.name]} />
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {showNewKey && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="mb-2 text-sm font-medium">
            Key created — copy it now. You won't see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-3 py-2 font-mono text-sm">
              {showNewKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyKey(showNewKey)}
            >
              {copied ? (
                <Check className="mr-1 size-3" />
              ) : (
                <Copy className="mr-1 size-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {!keys?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16">
          <KeyRound className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-4 rounded-lg border-2 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{key.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt && (
                    <>
                      {" "}
                      · Last used{" "}
                      {new Date(key.lastUsedAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="mr-1 size-3 text-destructive" />
                    Revoke
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Revoke API Key</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to revoke{" "}
                      <span className="font-medium text-foreground">
                        {key.name}
                      </span>
                      ? This cannot be undone. Any services using this key will
                      lose access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => revokeMutation.mutate({ id: key.id })}
                      disabled={revokeMutation.isPending}
                    >
                      Revoke
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
