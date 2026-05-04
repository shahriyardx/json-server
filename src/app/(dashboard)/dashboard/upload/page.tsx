"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"
import {
  UploadCloud,
  FileJson,
  X,
  Code,
  Sparkles,
  Minimize2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"

const formSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, dashes, and underscores allowed",
    ),
  jsonContent: z
    .string()
    .min(1, "JSON content is required")
    .refine(
      (val) => {
        try {
          JSON.parse(val)
          return true
        } catch {
          return false
        }
      },
      { message: "Invalid JSON format" },
    ),
})

type FormData = z.infer<typeof formSchema>
type UploadMode = "file" | "paste"

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
      const itemTypes = new Set(parsed.map((i) => (typeof i === "object" && i !== null ? (Array.isArray(i) ? "array" : "object") : typeof i)))
      return `Array(${parsed.length})${itemTypes.size === 1 ? ` of ${[...itemTypes][0]}` : ""}`
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

export default function UploadPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name

  const { push } = useRouter()
  const [mode, setMode] = useState<UploadMode>("file")
  const [file, setFile] = useState<File | null>(null)
  const [typeError, setTypeError] = useState("")
  const [sizeError, setSizeError] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [urlCopied, setUrlCopied] = useState(false)
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac")
  const [rawContent, setRawContent] = useState("")

  const uploadMutation = trpc.upload.uploadJson.useMutation()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filename: "",
      jsonContent: "",
    },
  })

  const watchedFilename = form.watch("filename")

  const contentBytes = useMemo(() => bytes(rawContent), [rawContent])
  const sizePercent = Math.min((contentBytes / MAX_FILE_SIZE) * 100, 100)
  const jsonShape = useMemo(() => {
    return rawContent ? getJsonShape(rawContent) : null
  }, [rawContent])
  const hasContent = mode === "file" ? !!file : !!rawContent

  const readFileContent = useCallback((f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(f)
    })
  }, [])

  const handleFile = useCallback(
    async (f: File) => {
      if (f.type !== "application/json" && !f.name.endsWith(".json")) {
        setTypeError("Only JSON files allowed")
        return
      }
      if (f.size > MAX_FILE_SIZE) {
        setSizeError("File exceeds 1MB size limit.")
        if (mode === "file") setFile(null)
        return
      }
      setTypeError("")
      setSizeError("")
      const name = f.name.replace(/\.json$/, "")
      form.setValue("filename", name)
      const content = await readFileContent(f)
      setRawContent(content)
      form.setValue("jsonContent", content)
      form.trigger()
      if (mode === "file") setFile(f)
    },
    [form, readFileContent, mode],
  )

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const f = accepted[0]
      if (!f) return
      await handleFile(f)
    },
    [handleFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    disabled: mode !== "file",
    onDropRejected: () => {},
  })

  const [dragOver, setDragOver] = useState(false)

  const handleTextareaDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files?.[0]
      if (f) await handleFile(f)
    },
    [handleFile],
  )

  const removeFile = () => {
    setFile(null)
    setTypeError("")
    setSizeError("")
    setRawContent("")
    form.setValue("filename", "")
    form.setValue("jsonContent", "")
    form.clearErrors("jsonContent")
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(rawContent)
      const formatted = JSON.stringify(parsed, null, 2)
      setRawContent(formatted)
      form.setValue("jsonContent", formatted)
      form.trigger("jsonContent")
    } catch {
      toast.error("Cannot format invalid JSON")
    }
  }

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(rawContent)
      const minified = JSON.stringify(parsed)
      setRawContent(minified)
      form.setValue("jsonContent", minified)
      form.trigger("jsonContent")
    } catch {
      toast.error("Cannot minify invalid JSON")
    }
  }

  const switchMode = (newMode: UploadMode) => {
    setMode(newMode)
    setFile(null)
    setTypeError("")
    setSizeError("")
    setRawContent("")
    form.setValue("filename", "")
    form.setValue("jsonContent", "")
    form.clearErrors("jsonContent")
  }

  const handleSubmit = async (data: FormData) => {
    try {
      const result = await uploadMutation.mutateAsync({ ...data, isPublic })
      const url = `${window.location.origin}/${username}/${result.filename}`
      await navigator.clipboard.writeText(url)
      toast.success("JSON uploaded! URL copied to clipboard.")
      push("/dashboard/my-jsons")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      form.handleSubmit(handleSubmit)()
    }
  }

  const copyUrl = async () => {
    if (!watchedFilename || !username) return
    const url = `${window.location.origin}/${username}/${watchedFilename}`
    await navigator.clipboard.writeText(url)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl p-5">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload JSON</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a .json file or paste content directly
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-8 flex overflow-hidden rounded-lg border-2">
        <button
          type="button"
          onClick={() => switchMode("file")}
          data-active={mode === "file" || undefined}
          className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors data-active:bg-muted data-active:text-foreground text-muted-foreground hover:text-foreground"
        >
          <UploadCloud className="size-4" />
          File
        </button>
        <button
          type="button"
          onClick={() => switchMode("paste")}
          data-active={mode === "paste" || undefined}
          className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors data-active:bg-muted data-active:text-foreground text-muted-foreground hover:text-foreground"
        >
          <Code className="size-4" />
          Paste
        </button>
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        onKeyDown={handleKeyDown}
        className="space-y-8"
      >
        <FieldGroup>
          {/* JSON Content */}
          <Controller
            name="jsonContent"
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                {mode === "file" ? (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="file-dropzone">
                      JSON File
                    </FieldLabel>
                    {file && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2.5">
                        <FileJson className="size-4 text-primary" />
                        <span className="flex-1 truncate text-sm font-medium">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(file.size)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile()
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    )}
                    <div
                      {...getRootProps()}
                      id="file-dropzone"
                      data-drag-active={isDragActive || undefined}
                      data-error={typeError || sizeError || undefined}
                      data-has-file={!!file || undefined}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-10 text-center transition-colors hover:border-muted-foreground/50 data-drag-active:border-primary data-drag-active:bg-primary/5 data-error:border-destructive data-error:bg-destructive/5 data-has-file:hidden"
                    >
                      <input {...getInputProps()} />
                      <UploadCloud className="size-8 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        {isDragActive ? (
                          "Drop file here"
                        ) : (
                          <>
                            Drag & drop or{" "}
                            <span className="text-primary">browse</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        .json files only
                      </p>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    {typeError && (
                      <p className="text-sm font-normal text-destructive" role="alert">
                        {typeError}
                      </p>
                    )}
                    {sizeError && (
                      <p className="text-sm font-normal text-destructive" role="alert">
                        {sizeError}
                      </p>
                    )}
                    <FieldDescription>
                      Select a .json file or drag & drop one here
                    </FieldDescription>
                  </Field>
                ) : (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="json-paste">
                      JSON Content
                    </FieldLabel>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={formatJson}
                          disabled={!rawContent}
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
                          disabled={!rawContent}
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
                        id="json-paste"
                        placeholder='{"key": "value"}'
                        rows={14}
                        value={field.value}
                        aria-invalid={fieldState.invalid}
                        onChange={(e) => {
                          const val = e.target.value
                          setRawContent(val)
                          field.onChange(val)
                          form.trigger("jsonContent")
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOver(true)
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleTextareaDrop}
                        data-drag-over={dragOver || undefined}
                        className="w-full rounded-lg border-2 bg-transparent p-3 font-mono text-sm transition-colors placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 aria-invalid:border-destructive data-drag-over:border-primary data-drag-over:bg-primary/5"
                      />
                    </div>
                    <FieldDescription>
                      Paste valid JSON or drop a .json file
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              </>
            )}
          />

          {/* Size indicator */}
          {hasContent && (
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
          <Controller
            name="filename"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="filename">Filename</FieldLabel>
                <Input
                  {...field}
                  id="filename"
                  placeholder="my-data"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Only letters, numbers, dashes, and underscores allowed
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

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
        {username && watchedFilename && (
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Endpoint URL
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyUrl}
                className="gap-1.5 text-xs"
              >
                {urlCopied ? (
                  <>
                    <Check className="size-3" />
                    Copied
                  </>
                ) : (
                  "Copy URL"
                )}
              </Button>
            </div>
            <p className="mt-1 font-mono text-sm">
              /{username}/{watchedFilename}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="space-y-2">
          <Button
            type="submit"
            className="w-full"
            disabled={!hasContent || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              "Uploading..."
            ) : (
              `Upload ${watchedFilename ? `"${watchedFilename}"` : "JSON"}`
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Press {isMac ? "⌘" : "Ctrl"}+Enter to submit
          </p>
        </div>
      </form>
    </div>
  )
}
