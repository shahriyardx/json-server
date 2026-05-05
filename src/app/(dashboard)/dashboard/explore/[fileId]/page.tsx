"use client"

import { use } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { JsonDataTable } from "@/components/json-data-table"
import { JsonTreeView } from "@/components/json-tree-view"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft } from "lucide-react"

export default function ExplorePage({
  params,
}: {
  params: Promise<{ fileId: string }>
}) {
  const { fileId } = use(params)
  const { data: file, isPending } = trpc.upload.getJson.useQuery({
    id: fileId,
  })

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <p className="text-sm text-muted-foreground">File not found.</p>
      </div>
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(file.content)
  } catch {
    parsed = null
  }

  const isArrayOfObjects =
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    parsed.every(
      (item) =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )

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
        <h1 className="text-2xl font-bold">{file.filename}.json</h1>
        <p className="mt-1 text-sm text-muted-foreground">Data browser</p>
      </div>

      {parsed === null ? (
        <p className="text-sm text-destructive">Invalid JSON content.</p>
      ) : isArrayOfObjects ? (
        <JsonDataTable data={parsed as Record<string, unknown>[]} />
      ) : (
        <ScrollArea className="rounded-lg border-2 p-3 text-xs">
          <div className="whitespace-nowrap">
            <JsonTreeView data={parsed} />
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
