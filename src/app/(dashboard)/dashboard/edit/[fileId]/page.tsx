"use client"

import { use, useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { trpc } from "@/lib/trpc/client"
import { ArrowLeft, Sparkles, Minimize2, Eye, EyeOff, Check } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

function bytes(str: string) {
  return new TextEncoder().encode(str).length
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1_048_576).toFixed(1)} MB`
}

function getJsonShape(val: string): string | null {
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) {
      const itemTypes = new Set(
        parsed.map((i) =>
          typeof i === "object" && i !== null
            ? Array.isArray(i)
              ? "array"
              : "object"
            : typeof i,
        ),
      )
      return `Array(${parsed.length})${
        itemTypes.size === 1 ? ` of ${[...itemTypes][0]}` : ""
      }`
    }
    if (typeof parsed === "object" && parsed !== null) {
      const keys = Object.keys(parsed)
      return `Object with ${keys.length} key${keys.length === 1 ? "" : "s"}`
    }
    return typeof parsed
  } catch {
    return null
  }
}

const MAX_FILE_SIZE = 1_048_576

export default function EditPage({
  params,
}: {
  params: Promise<{ fileId: string }>
}) {
  const { fileId } = use(params)
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name
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
  const [isPublic, setIsPublic] = useState(true)
  const [isMac, setIsMac] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac"))
  }, [])

  useEffect(() => {
    if (file) {
      setFilename(file.filename)
      setContent(file.content)
      setIsPublic(file.isPublic)
    }
  }, [file])

  const contentBytes = useMemo(() => bytes(content), [content])
  const sizePercent = Math.min((contentBytes / MAX_FILE_SIZE) * 100, 100)
  const jsonShape = useMemo(
    () => (content ? getJsonShape(content) : null),
    [content],
  )
  const isValid = (() => {
    try {
      JSON.parse(content)
      return true
    } catch {
      return false
    }
  })()

  const formatJson = () => {
    try {
      const parsed = JSON.parse(content)
      setContent(JSON.stringify(parsed, null, 2))
    } catch {
      toast.error("Cannot format invalid JSON")
    }
  }

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(content)
      setContent(JSON.stringify(parsed))
    } catch {
      toast.error("Cannot minify invalid JSON")
    }
  }

  const handleSave = () => {
    if (!filename || !content || !isValid) return
    updateMutation.mutate({ id: fileId, filename, jsonContent: content, isPublic })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSave()
    }
  }

  const copyUrl = async () => {
    if (!filename || !username) return
    const url = `${window.location.origin}/${username}/${filename}`
    await navigator.clipboard.writeText(url)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
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
    <div className="mx-auto max-w-2xl p-5">
      <Link
        href="/dashboard/my-jsons"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to My JSONs
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit JSON File</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit filename, content, or visibility
        </p>
      </div>

      <div
        className="space-y-8"
        onKeyDown={handleKeyDown}
      >
        <FieldGroup>
          {/* JSON Content */}
          <Field>
            <FieldLabel htmlFor="json-content">
              JSON Content
            </FieldLabel>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={formatJson}
                  disabled={!content}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  Format
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={minifyJson}
                  disabled={!content}
                  className="gap-1.5"
                >
                  <Minimize2 className="size-3.5" />
                  Minify
                </Button>
                {jsonShape && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {jsonShape}
                  </span>
                )}
              </div>
              <textarea
                id="json-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                spellCheck={false}
                className="w-full rounded-lg border-2 bg-transparent p-3 font-mono text-sm transition-colors placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 aria-invalid:border-destructive"
              />
            </div>
            <FieldDescription>
              Edit JSON content above
            </FieldDescription>
          </Field>

          {/* Size indicator */}
          {content && (
            <div className="-mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatBytes(contentBytes)}</span>
                <span>Max 1 MB</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    sizePercent >= 100 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${sizePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Filename */}
          <Field>
            <FieldLabel htmlFor="filename">Filename</FieldLabel>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="my-data"
              autoComplete="off"
            />
            <FieldDescription>
              Only letters, numbers, dashes, and underscores allowed
            </FieldDescription>
          </Field>

          {/* Visibility */}
          <Field>
            <FieldLabel>Visibility</FieldLabel>
            <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                data-public={isPublic || undefined}
                data-private={!isPublic || undefined}
                className="flex items-center gap-2 text-sm transition-colors data-public:text-primary data-private:text-muted-foreground"
              >
                {isPublic ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                <span className="font-medium">
                  {isPublic ? "Public" : "Private"}
                </span>
              </button>
              <span className="text-xs text-muted-foreground">
                {isPublic
                  ? "Anyone with the link can access this JSON"
                  : "Only you and users with an API key can access"}
              </span>
            </div>
          </Field>
        </FieldGroup>

        {/* URL Preview */}
        {username && filename && (
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Endpoint URL</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyUrl}
                className="gap-1.5 text-xs"
              >
                {urlCopied ? (
                  <>
                    <Check className="size-3" /> Copied
                  </>
                ) : (
                  "Copy URL"
                )}
              </Button>
            </div>
            <p className="mt-1 font-mono text-sm">
              /{username}/{filename}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={
              !filename || !content || !isValid || updateMutation.isPending
            }
            className="flex-1"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/my-jsons">Cancel</Link>
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Press {isMac ? "⌘" : "Ctrl"}+Enter to save
        </p>
      </div>
    </div>
  )
}
