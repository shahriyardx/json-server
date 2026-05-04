"use client"

import { use, useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { JsonDiffViewer } from "@/components/json-diff-viewer"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { ArrowLeft, RotateCcw, Pencil } from "lucide-react"
import { toast } from "sonner"

function sizeLabel(content: string) {
  const size = new TextEncoder().encode(content).length
  return size < 1024 ? `${size}B` : `${(size / 1024).toFixed(0)}KB`
}

export default function VersionsPage({
  params,
}: {
  params: Promise<{ fileId: string }>
}) {
  const { fileId } = use(params)
  const { data: file, isPending } = trpc.upload.getJson.useQuery({ id: fileId })
  const { data: versions } = trpc.versions.getFileVersions.useQuery({ fileId })
  const utils = trpc.useUtils()
  const [diffVersion, setDiffVersion] = useState<string | null>(null)

  const revertMutation = trpc.versions.revertToVersion.useMutation({
    onSuccess: () => {
      utils.versions.getFileVersions.invalidate()
      utils.upload.getJson.invalidate()
      toast.success("Reverted to selected version")
    },
    onError: (err) => toast.error(err.message),
  })

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      <Link
        href="/dashboard/my-jsons"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to My JSONs
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {file?.filename ?? "File"}.json
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Version history</p>
      </div>

      <div className="grid gap-3">
        {/* Latest Version — always shown */}
        {file && (
          <div className="rounded-lg border-2 border-primary/20 bg-primary/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Latest Version</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {sizeLabel(file.content)} ·{" "}
                  {new Date(file.updatedAt).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/edit/${fileId}`}>
                  <Pencil className="mr-1 size-3" />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Old versions */}
        {versions?.map((version, idx) => (
          <div key={version.id} className="rounded-lg border-2 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  Version {versions.length - idx}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(version.createdAt).toLocaleString()} ·{" "}
                  {sizeLabel(version.content)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDiffVersion(
                      diffVersion === version.id ? null : version.id,
                    )
                  }
                >
                  {diffVersion === version.id ? "Hide diff" : "View diff"}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <RotateCcw className="mr-1 size-3" />
                      Revert
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Revert to this version</DialogTitle>
                      <DialogDescription>
                        This will restore the file to Version{" "}
                        {versions.length - idx}. A new version of the
                        current content will be saved before reverting.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={() =>
                          revertMutation.mutate({
                            fileId,
                            versionId: version.id,
                          })
                        }
                        disabled={revertMutation.isPending}
                      >
                        {revertMutation.isPending ? "Reverting..." : "Revert"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            {diffVersion === version.id && file && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Diff: current vs Version {versions.length - idx}
                </p>
                <JsonDiffViewer
                  oldContent={file.content}
                  newContent={version.content}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
