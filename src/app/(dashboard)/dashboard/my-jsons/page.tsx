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
import { Input } from "@/components/ui/input"
import {
  Copy,
  Check,
  Trash2,
  BookOpen,
  Pencil,
  Download,
  Eye,
  History,
  Lock,
  Unlock,
  Search,
  Loader2,
} from "lucide-react"
import { useState, useCallback, useDeferredValue, useEffect } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import JSZip from "jszip"

export default function MyJsonsPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name
  const [searchQuery, setSearchQuery] = useState("")
  const deferredQuery = useDeferredValue(searchQuery)
  const { data: allFiles, isPending } = trpc.upload.getMyJsons.useQuery()
  const searchQuery_ = trpc.upload.searchJsons.useQuery(
    { query: deferredQuery },
    { enabled: deferredQuery.length > 0 },
  )
  const utils = trpc.useUtils()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const deleteMutation = trpc.upload.deleteJson.useMutation({
    onSuccess: () => {
      utils.upload.getMyJsons.invalidate()
      utils.upload.searchJsons.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleVisibility = trpc.upload.toggleFileVisibility.useMutation({
    onSuccess: () => {
      utils.upload.getMyJsons.invalidate()
      utils.upload.searchJsons.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const files = deferredQuery
    ? (searchQuery_.data ?? [])
    : (allFiles ?? [])
  const isSearching = deferredQuery.length > 0 && searchQuery_.isFetching

  const copyUrl = async (filename: string) => {
    const url = `${window.location.origin}/${username}/${filename}`
    await navigator.clipboard.writeText(url)
    setCopiedId(filename)
    toast.success("URL copied")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadJson = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportAll = useCallback(async () => {
    if (!allFiles?.length) return
    setExporting(true)
    try {
      const zip = new JSZip()
      for (const file of allFiles) {
        zip.file(`${file.filename}.json`, file.content)
      }
      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "my-json-files.zip"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Exported all files as ZIP")
    } catch {
      toast.error("Failed to create ZIP")
    } finally {
      setExporting(false)
    }
  }, [allFiles])

  const sizeLabel = (content: string) => {
    const size = new TextEncoder().encode(content).length
    return size < 1024 ? `${size}B` : `${(size / 1024).toFixed(0)}KB`
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My JSONs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your uploaded JSON files
          </p>
        </div>
        {allFiles && allFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportAll}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Download className="mr-1 size-3" />
            )}
            Export All ZIP
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search files by name or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!files.length ? (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No matching files." : "No JSON files yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {isSearching && (
            <p className="text-xs text-muted-foreground">Searching...</p>
          )}
          {files.map((file) => (
            <div key={file.id} className="rounded-lg border-2">
              <div className="flex items-center justify-between gap-4 rounded-t-lg bg-muted px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-mono text-sm font-medium">
                    {file.filename}.json
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      toggleVisibility.mutate({ id: file.id })
                    }
                    disabled={toggleVisibility.isPending}
                    title={file.isPublic ? "Make private" : "Make public"}
                  >
                    {file.isPublic ? (
                      <Unlock className="size-3" />
                    ) : (
                      <Lock className="size-3" />
                    )}
                  </Button>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {"isPublic" in file && !file.isPublic && (
                    <span className="mr-1">Private ·</span>
                  )}
                  {sizeLabel(file.content)} ·{" "}
                  {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadJson(file.filename, file.content)}
                >
                  <Download className="mr-1 size-3" />
                  Download
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/dashboard/docs/${username}/${file.filename}`}
                  >
                    <BookOpen className="mr-1 size-3" />
                    Docs
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/explore/${file.id}`}>
                    <Eye className="mr-1 size-3" />
                    Explore
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/versions/${file.id}`}>
                    <History className="mr-1 size-3" />
                    Versions
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
                        onClick={() =>
                          deleteMutation.mutate({ id: file.id })
                        }
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
