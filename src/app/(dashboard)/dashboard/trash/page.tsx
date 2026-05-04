"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { Trash2, RotateCcw, AlertTriangle, FileJson } from "lucide-react"
import { toast } from "sonner"

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1_048_576).toFixed(1)} MB`
}

function bytes(str: string) {
  return new TextEncoder().encode(str).length
}

type ConfirmAction = "restore" | "permanent-delete"

export default function TrashPage() {
  const utils = trpc.useUtils()
  const { data: files, isPending } = trpc.upload.trashFiles.useQuery()
  const restoreMutation = trpc.upload.restoreFile.useMutation({
    onSuccess: () => {
      utils.upload.trashFiles.invalidate()
      utils.upload.getMyJsons.invalidate()
      toast.success("File restored")
      setConfirm(null)
    },
    onError: (err) => {
      toast.error(err.message)
      setConfirm(null)
    },
  })
  const permanentDeleteMutation = trpc.upload.permanentDeleteFile.useMutation({
    onSuccess: () => {
      utils.upload.trashFiles.invalidate()
      toast.success("File permanently deleted")
      setConfirm(null)
    },
    onError: (err) => {
      toast.error(err.message)
      setConfirm(null)
    },
  })

  const [confirm, setConfirm] = useState<{
    id: string
    filename: string
    action: ConfirmAction
  } | null>(null)

  const handleConfirm = () => {
    if (!confirm) return
    if (confirm.action === "restore") {
      restoreMutation.mutate({ id: confirm.id })
    } else {
      permanentDeleteMutation.mutate({ id: confirm.id })
    }
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Trash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleted files stay here until permanently removed
        </p>
      </div>

      {!files || files.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Trash2 className="size-10" />
          <p className="text-sm">Trash is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 rounded-lg border px-4 py-3"
            >
              <FileJson className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(bytes(file.content))}
                  {file.deletedAt && (
                    <span>
                      {" · "}Deleted{" "}
                      {new Date(file.deletedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfirm({
                      id: file.id,
                      filename: file.filename,
                      action: "restore",
                    })
                  }
                  className="gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfirm({
                      id: file.id,
                      filename: file.filename,
                      action: "permanent-delete",
                    })
                  }
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <AlertTriangle className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === "restore"
                ? "Restore file"
                : "Permanently delete file"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.action === "restore" ? (
                <>
                  Restore <strong>{confirm?.filename}</strong> to your active
                  files? If a file with the same name exists, restore will fail.
                </>
              ) : (
                <>
                  Permanently delete <strong>{confirm?.filename}</strong>? This
                  action cannot be undone. All versions will be lost.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.action === "restore" ? "default" : "destructive"}
              onClick={handleConfirm}
              disabled={
                restoreMutation.isPending || permanentDeleteMutation.isPending
              }
            >
              {confirm?.action === "restore" ? "Restore" : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
