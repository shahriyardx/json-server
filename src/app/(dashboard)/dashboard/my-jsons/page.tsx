"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"

export default function MyJsonsPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name
  const { data: files, isPending } = trpc.upload.getMyJsons.useQuery()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyUrl = async (filename: string) => {
    const url = `${window.location.origin}/${username}/${filename}`
    await navigator.clipboard.writeText(url)
    setCopiedId(filename)
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
            <TableHead className="w-20">URL</TableHead>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
