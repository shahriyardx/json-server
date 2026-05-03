"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trpc } from "@/lib/trpc/client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function EditPage({
  params,
}: {
  params: Promise<{ fileId: string }>
}) {
  const { fileId } = use(params)
  const router = useRouter()
  const { data: file, isPending } = trpc.upload.getJson.useQuery({ id: fileId })
  const updateMutation = trpc.upload.updateJson.useMutation({
    onSuccess: () => {
      toast.success("File updated")
      router.push("/dashboard/my-jsons")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const [filename, setFilename] = useState("")
  const [content, setContent] = useState("")

  useEffect(() => {
    if (file) {
      setFilename(file.filename)
      setContent(file.content)
    }
  }, [file])

  const isValidJson = () => {
    try {
      JSON.parse(content)
      return true
    } catch {
      return false
    }
  }

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
        <p className="text-sm text-muted-foreground">File not found</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      <Link
        href="/dashboard/my-jsons"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to My JSONs
      </Link>
      <h1 className="text-2xl font-bold">Edit JSON File</h1>

      <div className="mt-6 max-w-md">
        <label htmlFor="filename" className="mb-1 block text-sm text-muted-foreground">
          Filename
        </label>
        <Input
          id="filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="content" className="mb-1 block text-sm text-muted-foreground">
          JSON Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border bg-transparent p-4 font-mono text-sm outline-none"
          rows={20}
          spellCheck={false}
        />
      </div>

      {!isValidJson() && content.length > 0 && (
        <p className="mt-1 text-xs text-red-500">Invalid JSON</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={() => updateMutation.mutate({ id: fileId, filename, jsonContent: content })}
          disabled={!filename || !content || !isValidJson() || updateMutation.isPending}
        >
          Save Changes
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/my-jsons">Cancel</Link>
        </Button>
      </div>
    </div>
  )
}
