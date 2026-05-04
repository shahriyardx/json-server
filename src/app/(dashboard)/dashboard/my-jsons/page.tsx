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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  MoreHorizontal,
  FileJson,
  Upload,
  ChevronRight,
  ChevronLeft,
  LayoutList,
  Grid3X3,
  Calendar,
  Clock,
} from "lucide-react"
import { useState, useCallback, useEffect, useMemo, Fragment } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import JSZip from "jszip"
import { cn } from "@/lib/utils"

type ViewMode = "list" | "grid"
type SortField = "newest" | "oldest" | "name-asc" | "name-desc" | "size-asc" | "size-desc"
type SizeFilter = "all" | "small" | "medium" | "large"
type TypeFilter = "all" | "object" | "array"

function computeSize(content: string) {
  const bytes = new TextEncoder().encode(content).length
  return { bytes, label: bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(0)}KB` }
}

function contentType(content: string): TypeFilter | "other" {
  try {
    const p = JSON.parse(content)
    if (Array.isArray(p)) return "array"
    if (typeof p === "object" && p !== null) return "object"
    return "other"
  } catch {
    return "other"
  }
}

export default function MyJsonsPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name

  // Search
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Queries
  const { data: allFiles, isPending } = trpc.upload.getMyJsons.useQuery()
  const searchQuery_ = trpc.upload.searchJsons.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  )
  const utils = trpc.useUtils()

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [sortBy, setSortBy] = useState<SortField>("newest")
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | null>(null)

  // Mutations
  const deleteMutation = trpc.upload.deleteJson.useMutation({
    onSuccess: () => {
      utils.upload.getMyJsons.invalidate()
      utils.upload.searchJsons.invalidate()
      setDeleteTarget(null)
      toast.success("File deleted")
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

  // Derived data
  const rawFiles = debouncedQuery ? (searchQuery_.data ?? []) : (allFiles ?? [])
  const isSearching = debouncedQuery.length > 0 && searchQuery_.isFetching

  // Filter / sort
  const filteredFiles = useMemo(() => {
    let result = [...rawFiles]
    if (sizeFilter === "small") result = result.filter((f) => computeSize(f.content).bytes < 1024)
    if (sizeFilter === "medium") result = result.filter((f) => { const b = computeSize(f.content).bytes; return b >= 1024 && b < 10240 })
    if (sizeFilter === "large") result = result.filter((f) => computeSize(f.content).bytes >= 10240)
    if (typeFilter !== "all") result = result.filter((f) => contentType(f.content) === typeFilter)
    result.sort((a, b) => {
      const aSize = computeSize(a.content).bytes
      const bSize = computeSize(b.content).bytes
      switch (sortBy) {
        case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "name-asc": return a.filename.localeCompare(b.filename)
        case "name-desc": return b.filename.localeCompare(a.filename)
        case "size-asc": return aSize - bSize
        case "size-desc": return bSize - aSize
        default: return 0
      }
    })
    return result
  }, [rawFiles, sortBy, sizeFilter, typeFilter])

  // Pagination
  const totalFiles = filteredFiles.length
  const totalPages = Math.max(1, Math.ceil(totalFiles / pageSize))
  const paginatedFiles = filteredFiles.slice((page - 1) * pageSize, page * pageSize)
  const allSelected = paginatedFiles.length > 0 && selected.size === paginatedFiles.length

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [searchQuery, sortBy, sizeFilter, typeFilter])

  // Select handlers
  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => allSelected ? setSelected(new Set()) : setSelected(new Set(paginatedFiles.map((f) => f.id)))

  // Actions
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
      for (const f of allFiles) zip.file(`${f.filename}.json`, f.content)
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

  // Keyboard shortcut for search
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac")
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My JSONs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your uploaded JSON files
          </p>
        </div>
        {allFiles && allFiles.length > 0 && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="sm"
            onClick={exportAll}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 size-3.5" />
            )}
            Export All ZIP
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-search-input
            placeholder="Search files by name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-16"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="h-9 rounded-lg border bg-background px-3 text-xs text-muted-foreground"
        >
          <option value="newest">Sort by: Newest</option>
          <option value="oldest">Sort by: Oldest</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="size-asc">Size (smallest)</option>
          <option value="size-desc">Size (largest)</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="h-9 rounded-lg border bg-background px-3 text-xs text-muted-foreground"
        >
          <option value="all">All types</option>
          <option value="object">Object</option>
          <option value="array">Array</option>
        </select>
        <select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value as SizeFilter)}
          className="h-9 rounded-lg border bg-background px-3 text-xs text-muted-foreground"
        >
          <option value="all">All sizes</option>
          <option value="small">Small (&lt;1KB)</option>
          <option value="medium">Medium (1-10KB)</option>
          <option value="large">Large (&gt;10KB)</option>
        </select>
        <div className="flex rounded-lg border">
          <Button
            variant="ghost"
            size="sm"
            className={cn("rounded-r-none", viewMode === "list" && "bg-muted")}
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("rounded-l-none", viewMode === "grid" && "bg-muted")}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!filteredFiles.length ? (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <FileJson className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No matching files." : "No JSON files yet."}
          </p>
          {!searchQuery && (
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/upload">
                <Upload className="mr-1 size-3" />
                Upload your first file
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        // ─── Table view ───
        <div className="rounded-lg border-2">
          {isSearching && (
            <p className="px-4 pt-3 text-xs text-muted-foreground">Searching...</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="size-3.5 accent-indigo-500"
                  />
                </TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFiles.map((file) => {
                const isExpanded = expandedId === file.id
                const size = computeSize(file.content)
                return (
                  <Fragment key={file.id}>
                    <TableRow data-state={isExpanded ? "selected" : undefined}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(file.id)}
                          onChange={() => toggleSelect(file.id)}
                          className="size-3.5 accent-indigo-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-md border bg-indigo-500/10 text-indigo-500">
                            <FileJson className="size-4" />
                          </div>
                          <span className="font-mono text-sm font-medium text-white">
                            {file.filename}.json
                          </span>
                          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-500">
                            JSON
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {size.label}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3" />
                          {new Date(file.updatedAt).toLocaleDateString()}
                          <Clock className="ml-0.5 size-3" />
                          {new Date(file.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            file.isPublic
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500",
                          )}
                        >
                          {file.isPublic ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                          {file.isPublic ? "Public" : "Private"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => downloadJson(file.filename, file.content)}
                            title="Download"
                          >
                            <Download className="size-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-sm">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/edit/${file.id}`}>
                                  <Pencil className="mr-2 size-3" />Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/explore/${file.id}`}>
                                  <Eye className="mr-2 size-3" />Explore
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/versions/${file.id}`}>
                                  <History className="mr-2 size-3" />Versions
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/docs/${username}/${file.filename}`}>
                                  <BookOpen className="mr-2 size-3" />Docs
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ id: file.id, filename: file.filename })}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-3" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setExpandedId(isExpanded ? null : file.id)}
                          >
                            <ChevronRight
                              className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")}
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="border-t border-b px-6 py-5">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Details */}
                              <div>
                                <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                  Details
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 text-sm">
                                    <FileJson className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="text-muted-foreground w-16">Type:</span>
                                    <span className="text-white capitalize">{contentType(file.content)}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="text-muted-foreground w-16">Created:</span>
                                    <span className="text-white">
                                      {new Date(file.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="text-muted-foreground w-16">Modified:</span>
                                    <span className="text-white">
                                      {new Date(file.updatedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Actions */}
                              <div>
                                <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                  Actions
                                </h4>
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                      onClick={() => copyUrl(file.filename)}
                                    >
                                      <Copy className="mr-1 size-3" />
                                      Copy URL
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                      onClick={() => downloadJson(file.filename, file.content)}
                                    >
                                      <Download className="mr-1 size-3" />
                                      Download
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                      <Link href={`/dashboard/docs/${username}/${file.filename}`}>
                                        <BookOpen className="mr-1 size-3" />
                                        Docs
                                      </Link>
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                      <Link href={`/dashboard/versions/${file.id}`}>
                                        <History className="mr-1 size-3" />
                                        Versions
                                      </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                      <Link href={`/dashboard/edit/${file.id}`}>
                                        <Pencil className="mr-1 size-3" />
                                        Edit
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 text-red-500 hover:text-red-500"
                                      onClick={() =>
                                        setDeleteTarget({ id: file.id, filename: file.filename })
                                      }
                                    >
                                      <Trash2 className="mr-1 size-3" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        // ─── Grid view ───
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedFiles.map((file) => {
            const size = computeSize(file.content)
            return (
              <div key={file.id} className="rounded-lg border-2 p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-md border bg-indigo-500/10 text-indigo-500">
                    <FileJson className="size-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-sm">
                      <DropdownMenuItem onClick={() => copyUrl(file.filename)}>
                        <Copy className="mr-2 size-3" />Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadJson(file.filename, file.content)}>
                        <Download className="mr-2 size-3" />Download
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/edit/${file.id}`}>
                          <Pencil className="mr-2 size-3" />Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/explore/${file.id}`}>
                          <Eye className="mr-2 size-3" />Explore
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ id: file.id, filename: file.filename })}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-3" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mb-1 font-mono text-sm font-medium text-white truncate">
                  {file.filename}.json
                </p>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-500">
                    JSON
                  </span>
                  <span className="text-xs text-muted-foreground">{size.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(file.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      file.isPublic
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500",
                    )}
                  >
                    {file.isPublic ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                    {file.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Pagination Footer ─── */}
      {filteredFiles.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, totalFiles)} of {totalFiles} files
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="icon-xs"
                className={p === page ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="h-7 rounded border bg-background px-2 text-xs"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      )}

      {/* ─── Delete confirmation dialog ─── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete JSON file</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.filename}.json
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
