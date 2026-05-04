"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"
import { UploadCloud, FileJson, X, Code } from "lucide-react"
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

export default function UploadPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name

  const router = useRouter()
  const [mode, setMode] = useState<UploadMode>("file")
  const [file, setFile] = useState<File | null>(null)
  const [typeError, setTypeError] = useState("")
  const [sizeError, setSizeError] = useState("")

  const uploadMutation = trpc.upload.uploadJson.useMutation()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filename: "",
      jsonContent: "",
    },
  })

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
      if (f.size > 1_048_576) {
        setSizeError("File exceeds 1MB size limit.")
        if (mode === "file") setFile(null)
        return
      }
      setTypeError("")
      setSizeError("")
      const name = f.name.replace(/\.json$/, "")
      form.setValue("filename", name)
      const content = await readFileContent(f)
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
    form.setValue("filename", "")
    form.setValue("jsonContent", "")
    form.clearErrors("jsonContent")
  }

  const switchMode = (newMode: UploadMode) => {
    setMode(newMode)
    setFile(null)
    setTypeError("")
    setSizeError("")
  }

  const handleSubmit = async (data: FormData) => {
    try {
      const result = await uploadMutation.mutateAsync(data)
      const url = `${window.location.origin}/${username}/${result.filename}`
      await navigator.clipboard.writeText(url)
      toast.success("JSON uploaded! URL copied to clipboard.")
      router.push("/dashboard/my-jsons")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    }
  }

  const watchedFilename = form.watch("filename")
  const hasContent = mode === "file" ? !!file : !!form.watch("jsonContent")

  return (
    <div className="max-w-2xl p-5">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload JSON</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a file or paste JSON content
        </p>
      </div>

      <div className="mb-6 flex overflow-hidden rounded-lg border-2">
        <button
          type="button"
          onClick={() => switchMode("file")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "file"
              ? "bg-muted text-foreground"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UploadCloud className="size-4" />
          File
        </button>
        <button
          type="button"
          onClick={() => switchMode("paste")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "paste"
              ? "bg-muted text-foreground"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code className="size-4" />
          Paste
        </button>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="jsonContent"
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                {mode === "file" ? (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="file-dropzone">File</FieldLabel>
                    <div
                      {...getRootProps()}
                      id="file-dropzone"
                      data-drag-active={isDragActive || undefined}
                      data-error={typeError || sizeError || undefined}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-10 text-center transition-colors hover:border-muted-foreground/50 data-drag-active:border-primary data-drag-active:bg-primary/5 data-error:border-destructive data-error:bg-destructive/5"
                    >
                      <input {...getInputProps()} />
                      {file ? (
                        <div className="flex items-center gap-2">
                          <FileJson className="size-8 text-primary" />
                          <span className="font-medium">{file.name}</span>
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
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    {typeError && (
                      <p
                        className="text-sm font-normal text-destructive"
                        role="alert"
                      >
                        {typeError}
                      </p>
                    )}
                    {sizeError && (
                      <p
                        className="text-sm font-normal text-destructive"
                        role="alert"
                      >
                        {sizeError}
                      </p>
                    )}
                  </Field>
                ) : (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="json-paste">JSON Content</FieldLabel>
                    <textarea
                      id="json-paste"
                      placeholder='{"key": "value"}'
                      rows={12}
                      value={field.value}
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        field.onChange(e.target.value)
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
        </FieldGroup>
        {username && watchedFilename && (
          <p className="text-xs text-muted-foreground">
            Your JSON will be accessible at /{username}/
            <span className="font-mono text-foreground">{watchedFilename}</span>
            .json
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={!hasContent || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </div>
  )
}
