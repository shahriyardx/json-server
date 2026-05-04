"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Copy, Check, Trash2, BookOpen, Pencil } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"

export default function MyJsonsPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name
  const { data: files, isPending } = trpc.upload.getMyJsons.useQuery()
  const utils = trpc.useUtils()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const deleteMutation = trpc.upload.deleteJson.useMutation({
    onSuccess: () => {
      utils.upload.getMyJsons.invalidate()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const copyUrl = async (filename: string) => {
    const url = `${window.location.origin}/${username}/${filename}`
    await navigator.clipboard.writeText(url)
    setCopiedId(filename)
    toast.success("URL copied")
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!files?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">No JSON files yet.</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My JSONs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your uploaded JSON files
        </p>
      </div>
      <div className="grid gap-3">
        {files.map((file) => {
          const size = new TextEncoder().encode(file.content).length
          const sizeLabel = size < 1024 ? `${size}B` : `${(size / 1024).toFixed(0)}KB`
          return (
          <div
            key={file.id}
            className="rounded-lg border-2"
          >
            <div className="flex items-center justify-between gap-4 rounded-t-lg bg-muted px-4 py-2.5">
              <p className="truncate font-mono text-sm font-medium">
                {file.filename}.json
              </p>
              <p className="shrink-0 text-xs text-muted-foreground">
                {sizeLabel} · {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyUrl(file.filename)}
              >
                {copiedId === file.filename ? (
                  <Check className="mr-1 size-3" />
                ) : (
                  <Copy className="mr-1 size-3" />
                )}
                Copy URL
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/docs/${username}/${file.filename}`}>
                  <BookOpen className="mr-1 size-3" />
                  Docs
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/edit/${file.id}`}>
                  <Pencil className="mr-1 size-3" />
                  Edit
                </Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="mr-1 size-3 text-destructive" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete JSON file</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <span className="font-medium text-foreground">
                        {file.filename}.json
                      </span>
                      ? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate({ id: file.id })}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}
