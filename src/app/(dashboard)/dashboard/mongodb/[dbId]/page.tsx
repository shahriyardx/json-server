"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Loader2,
  ArrowLeft,
  Trash2,
  Eye,
  DatabaseIcon,
  Settings,
  Eraser,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"

export default function DatabaseDetailPage() {
  const { dbId } = useParams<{ dbId: string }>()
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: db, isPending } = trpc.mongo.getDatabase.useQuery({ id: dbId })

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [clearTarget, setClearTarget] = useState<string | null>(null)
  const [deleteDbOpen, setDeleteDbOpen] = useState(false)

  const deleteDb = trpc.mongo.deleteDatabase.useMutation({
    onSuccess: () => {
      utils.mongo.listDatabases.invalidate()
      router.push("/dashboard/mongodb")
      toast.success("Database deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  const clearCollection = trpc.mongo.clearCollection.useMutation({
    onSuccess: () => {
      utils.mongo.getDatabase.invalidate({ id: dbId })
      setClearTarget(null)
      toast.success("Collection cleared")
    },
    onError: (err) => toast.error(err.message),
  })

  const dropCollection = trpc.mongo.dropCollection.useMutation({
    onSuccess: () => {
      utils.mongo.getDatabase.invalidate({ id: dbId })
      toast.success("Collection dropped")
    },
    onError: (err) => toast.error(err.message),
  })

  if (isPending) {
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
          <Link href="/dashboard/mongodb/databases">Go back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/dashboard/mongodb/databases">
            <ArrowLeft className="mr-1 size-3.5" />
            Databases
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <DatabaseIcon className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{db.name}</h1>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections">
            <DatabaseIcon className="mr-1.5 size-3.5" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1.5 size-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Collections tab */}
        <TabsContent value="collections" className="mt-4">
          {db.collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <DatabaseIcon className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No collections yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Collections auto-create when documents are inserted.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.collections.map((col) => (
                    <TableRow key={col.name}>
                      <TableCell className="font-mono font-medium">
                        {col.name}
                      </TableCell>
                      <TableCell>{col.documentCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/dashboard/mongodb/${db.id}/collections/${col.name}`}
                            >
                              <Eye className="mr-1 size-3" />
                              Browse
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClearTarget(col.name)}
                            disabled={col.documentCount === 0}
                          >
                            <Eraser className="mr-1 size-3" />
                            Clear
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(col.name)}
                          >
                            <Trash2 className="mr-1 size-3" />
                            Drop
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="mt-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Permanently delete this database and all its collections
                and documents. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDbOpen(true)}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete Database
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drop collection dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop collection</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-medium text-foreground">{deleteTarget}</span>
              {" "}and all its documents? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) dropCollection.mutate({
                  databaseId: dbId,
                  collection: deleteTarget,
                })
              }}
              disabled={dropCollection.isPending}
            >
              {dropCollection.isPending ? "Dropping..." : "Drop"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear collection dialog */}
      <Dialog
        open={!!clearTarget}
        onOpenChange={(o) => { if (!o) setClearTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear collection</DialogTitle>
            <DialogDescription>
              Remove all documents from{" "}
              <span className="font-medium text-foreground">{clearTarget}</span>
              ? The collection will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClearTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (clearTarget) clearCollection.mutate({
                  databaseId: dbId,
                  collection: clearTarget,
                })
              }}
              disabled={clearCollection.isPending}
            >
              {clearCollection.isPending ? "Clearing..." : "Clear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete database dialog */}
      <Dialog open={deleteDbOpen} onOpenChange={setDeleteDbOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete database</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-medium text-foreground">{db.name}</span>
              {" "}and all its data? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDbOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDb.mutate({ id: dbId })}
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
