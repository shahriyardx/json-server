"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
      <Table className="border-2">
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-mono text-sm">
                {file.filename}.json
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(file.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => copyUrl(file.filename)}
                  >
                    {copiedId === file.filename ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon-xs" asChild>
                    <Link href={`/dashboard/docs/${username}/${file.filename}`}>
                      <BookOpen className="size-3" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon-xs" asChild>
                    <Link href={`/dashboard/edit/${file.id}`}>
                      <Pencil className="size-3" />
                    </Link>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon-xs">
                        <Trash2 className="size-3 text-destructive" />
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
