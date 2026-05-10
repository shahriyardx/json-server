"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Loader2,
  Search,
  ChevronRight,
  DatabaseIcon,
  ExternalLink,
  Table2,
  Trash2,
} from "lucide-react"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

export default function DatabasesBrowserPage() {
  const utils = trpc.useUtils()
  const { data: dbs, isPending } = trpc.mongo.listDatabases.useQuery()
  const [search, setSearch] = useState("")
  const [expandedDb, setExpandedDb] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const deleteDb = trpc.mongo.deleteDatabase.useMutation({
    onSuccess: () => {
      utils.mongo.listDatabases.invalidate()
      setDeleteTarget(null)
      setExpandedDb(null)
      toast.success("Database deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  // Fetch lightweight collection list when expanded
  const collections = trpc.mongo.listCollections.useQuery(
    { id: expandedDb! },
    { enabled: !!expandedDb },
  )

  const filtered = useMemo(() => {
    if (!dbs) return []
    if (!search) return dbs
    const q = search.toLowerCase()
    return dbs.filter((db) => db.name.toLowerCase().includes(q))
  }, [dbs, search])

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Databases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse collections and documents
        </p>
      </div>

      {/* Search */}
      {dbs && dbs.length > 0 && (
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search databases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Empty state */}
      {!dbs?.length ? (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <DatabaseIcon className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No databases yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect via mongodx SDK — databases auto-create on first access.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No matching databases.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((db) => {
            const isOpen = expandedDb === db.id

            return (
              <div key={db.id} className="rounded-lg border">
                {/* Database header */}
                <button
                  type="button"
                  onClick={() => setExpandedDb(isOpen ? null : db.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "size-4 text-muted-foreground transition-transform shrink-0",
                      isOpen && "rotate-90",
                    )}
                  />
                  <DatabaseIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-mono font-medium text-sm flex-1">
                    {db.name}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/mongodb/${db.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget({ id: db.id, name: db.name })
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Drop
                  </Button>
                </button>

                {/* Collections list */}
                {isOpen && (
                  <div className="border-t bg-muted/20">
                    {collections.isFetching ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : collections.data?.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        No collections in this database.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {collections.data?.map((col) => (
                          <Link
                            key={col.name}
                            href={`/dashboard/mongodb/${db.id}/collections/${col.name}`}
                            className="flex items-center gap-3 px-4 py-2.5 pl-12 text-sm hover:bg-muted/50 transition-colors"
                          >
                            <Table2 className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs flex-1">
                              {col.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {col.documentCount} doc{col.documentCount !== 1 ? "s" : ""}
                            </span>
                            <ChevronRight className="size-3 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete database</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              and all its collections and documents? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteDb.mutate({ id: deleteTarget.id })
              }}
              disabled={deleteDb.isPending}
            >
              {deleteDb.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
