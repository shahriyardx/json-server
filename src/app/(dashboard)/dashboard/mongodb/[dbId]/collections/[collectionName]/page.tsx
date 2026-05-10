"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Loader2,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  DatabaseIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect, useMemo, Fragment } from "react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"

export default function CollectionBrowsePage() {
  const { dbId, collectionName } = useParams<{
    dbId: string
    collectionName: string
  }>()
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: db, isPending: dbLoading } = trpc.mongo.getDatabase.useQuery({ id: dbId })
  const { data: rawDocs, isPending: docsLoading } = trpc.mongo.listCollectionDocuments.useQuery(
    { databaseId: dbId, collection: collectionName },
  )

  const [filterKey, setFilterKey] = useState("")
  const [filterValue, setFilterValue] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [insertOpen, setInsertOpen] = useState(false)
  const [insertJson, setInsertJson] = useState("{\n  \n}")

  const insertDoc = trpc.mongo.insertDocument.useMutation({
    onSuccess: () => {
      utils.mongo.listCollectionDocuments.invalidate({ databaseId: dbId, collection: collectionName })
      utils.mongo.getDatabase.invalidate({ id: dbId })
      setInsertOpen(false)
      setInsertJson("{\n  \n}")
      toast.success("Document inserted")
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteDoc = trpc.mongo.deleteDocument.useMutation({
    onSuccess: () => {
      utils.mongo.listCollectionDocuments.invalidate({ databaseId: dbId, collection: collectionName })
      utils.mongo.getDatabase.invalidate({ id: dbId })
      toast.success("Document deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  const documents = useMemo(() => {
    if (!rawDocs) return [] as Record<string, unknown>[]
    return rawDocs.map((d) => ({ ...d.data, __prismaId: d.id } as Record<string, unknown>))
  }, [rawDocs])

  const filtered = useMemo(() => {
    if (!filterKey && !filterValue) return documents
    return documents.filter((doc) => {
      if (filterKey && filterValue) {
        return String(doc[filterKey] ?? "") === filterValue
      }
      if (filterKey) {
        return doc[filterKey] !== undefined
      }
      if (filterValue) {
        return Object.values(doc).some(
          (v) => String(v).toLowerCase().includes(filterValue.toLowerCase()),
        )
      }
      return true
    })
  }, [documents, filterKey, filterValue])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [filterKey, filterValue])

  function handleInsert() {
    let doc: Record<string, unknown>
    try {
      doc = JSON.parse(insertJson)
    } catch {
      toast.error("Invalid JSON")
      return
    }
    insertDoc.mutate({ databaseId: dbId, collection: collectionName, document: doc })
  }

  function handleDelete(prismaId: string) {
    if (!confirm("Delete this document?")) return
    deleteDoc.mutate({ documentId: prismaId, databaseId: dbId })
  }

  function toggleRow(idx: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function getPreviewFields(
    doc: Record<string, unknown>,
  ): [string, unknown][] {
    return Object.entries(doc).filter(([k]) => k !== "__prismaId").slice(0, 3)
  }

  if (dbLoading || docsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!db) {
    return (
      <div className="p-5">
        <p className="text-sm text-muted-foreground">Database not found.</p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href="/dashboard/mongodb">Go back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href={`/dashboard/mongodb/${dbId}`}>
            <ArrowLeft className="mr-1 size-3.5" />
            {db.name}
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DatabaseIcon className="size-5 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono">
                {collectionName}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
                {filtered.length < documents.length &&
                  ` (${filtered.length} filtered)`}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setInsertOpen(true)}>
            <Plus className="mr-1 size-3.5" />
            Insert Document
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by value..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="Field name..."
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
          className="max-w-[160px]"
        />
        {(filterKey || filterValue) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterKey("")
              setFilterValue("")
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Documents */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <DatabaseIcon className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filterKey || filterValue
              ? "No matching documents."
              : "Collection is empty."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">_id</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((doc, idx) => {
                const globalIdx = (page - 1) * pageSize + idx
                const id = doc._id ?? doc.id ?? "(no id)"
                const preview = getPreviewFields(doc)
                const prismaId = doc.__prismaId as string
                return (
                  <Fragment key={globalIdx}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleRow(globalIdx)}
                    >
                      <TableCell className="font-mono text-xs">
                        {String(id).slice(0, 30)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {preview.map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
                            >
                              <span className="text-muted-foreground">{k}:</span>
                              <span className="font-mono">
                                {typeof v === "object"
                                  ? JSON.stringify(v)
                                  : String(v)}
                              </span>
                            </span>
                          ))}
                          {Object.keys(doc).filter((k) => k !== "__prismaId").length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{Object.keys(doc).filter((k) => k !== "__prismaId").length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {globalIdx + 1}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(prismaId)
                          }}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(globalIdx) && (
                      <TableRow key={`exp-${globalIdx}`}>
                        <TableCell colSpan={4} className="bg-muted/30 p-4">
                          <pre className="overflow-x-auto rounded bg-background p-3 text-xs font-mono">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(doc).filter(([k]) => k !== "__prismaId")
                              ), null, 2
                            )}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, filtered.length)} of{" "}
            {filtered.length} documents
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="icon-xs"
                className={
                  p === page
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : ""
                }
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Insert dialog */}
      <Dialog open={insertOpen} onOpenChange={setInsertOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Document</DialogTitle>
            <DialogDescription>
              Add a new document to{" "}
              <span className="font-medium text-foreground font-mono">
                {collectionName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[200px] w-full rounded-md border bg-background p-3 font-mono text-xs"
            value={insertJson}
            onChange={(e) => setInsertJson(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInsertOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInsert}
              disabled={insertDoc.isPending}
            >
              {insertDoc.isPending ? "Inserting..." : "Insert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
