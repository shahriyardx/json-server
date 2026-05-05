"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import ReactJson from "@microlink/react-json-view"
import { trpc } from "@/lib/trpc/client"
import { authClient } from "@/lib/auth-client"
import { JsonDataTable } from "@/components/json-data-table"
import { ApiSnippets } from "@/components/api-snippets"
import { ArrowLeft } from "lucide-react"

export default function ExplorePage({
  params,
}: {
  params: Promise<{ fileId: string }>
}) {
  const { fileId } = use(params)
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name
  const [origin, setOrigin] = useState("")
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    const check = () => setDark(document.documentElement.classList.contains("dark"))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

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
        href="/dashboard/json"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to JSON Files
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
        <div className="rounded-lg border overflow-auto max-h-[70vh]">
          <div className="p-4">
            <ReactJson
              src={parsed as Record<string, unknown> | unknown[]}
              theme={dark ? "monokai" : "summerfruit"}
              collapsed={2}
              enableClipboard={true}
              displayDataTypes={false}
              name={false}
              iconStyle="triangle"
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        {username && <ApiSnippets url={`${origin}/${username}/${file.filename}`} />}
      </div>
    </div>
  )
}
