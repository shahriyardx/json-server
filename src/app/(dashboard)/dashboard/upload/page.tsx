"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"
import { UploadCloud, FileJson, X } from "lucide-react"
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
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, dashes, and underscores allowed"),
  jsonContent: z.string().min(1, "Select a JSON file"),
})

type FormData = z.infer<typeof formSchema>

export default function UploadPage() {
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name

  const router = useRouter()
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

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const f = accepted[0]
      if (!f) return
      if (f.type !== "application/json" && !f.name.endsWith(".json")) {
        setTypeError("Only JSON files allowed")
        return
      }
      if (f.size > 1_048_576) {
        setSizeError("File exceeds 1MB size limit.")
        setFile(null)
        return
      }
      setTypeError("")
      setSizeError("")
      setFile(f)
      const name = f.name.replace(/\.json$/, "")
      form.setValue("filename", name)
      form.setValue("jsonContent", await readFileContent(f))
      form.trigger()
    },
    [form, readFileContent],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    onDropRejected: () => {},
  })

  const removeFile = () => {
    setFile(null)
    setTypeError("")
    setSizeError("")
    form.setValue("filename", "")
    form.setValue("jsonContent", "")
    form.clearErrors("jsonContent")
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

  return (
    <div className="max-w-lg p-5">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload JSON</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop a JSON file or click to browse
        </p>
      </div>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="jsonContent"
            control={form.control}
            render={({ field: _, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="file-dropzone">File</FieldLabel>
                <div
                  {...getRootProps()}
                  id="file-dropzone"
                  data-drag-active={isDragActive || undefined}
                  data-error={(typeError || sizeError) || undefined}
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
                  <p className="text-sm font-normal text-destructive" role="alert">{typeError}</p>
                )}
                {sizeError && (
                  <p className="text-sm font-normal text-destructive" role="alert">{sizeError}</p>
                )}
              </Field>
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
          disabled={!file || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </div>
  )
}
