"use client"

import { use, useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { trpc } from "@/lib/trpc/client"
import {
  ArrowLeft,
  Sparkles,
  Minimize2,
  Eye,
  EyeOff,
  Check,
  Webhook,
  Copy,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

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
  const { push } = useRouter()
  const { data: session } = authClient.useSession()
  const username = session?.user?.username || session?.user?.name
  const { data: file, isPending } = trpc.upload.getJson.useQuery({ id: fileId })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { filename: "", jsonContent: "" },
  })

  const watchedContent = form.watch("jsonContent")

  const [isPublic, setIsPublic] = useState(true)
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac")
  const [urlCopied, setUrlCopied] = useState(false)
  const [draftUrl, setDraftUrl] = useState("")
  const [plaintextSecret, setPlaintextSecret] = useState<string | null>(null)
  const [showNewSecret, setShowNewSecret] = useState(false)

  const utils = trpc.useUtils()

  const { data: webhook } = trpc.webhooks.getWebhook.useQuery(
    { fileId },
    { enabled: !!file },
  )
  const upsertWebhook = trpc.webhooks.upsertWebhook.useMutation({
    onSuccess: (data) => {
      setPlaintextSecret(data.secret)
      setShowNewSecret(true)
      utils.webhooks.getWebhook.invalidate({ fileId })
      toast.success("Webhook configured")
    },
    onError: (err) => toast.error(err.message),
  })
  const toggleWebhook = trpc.webhooks.toggleWebhook.useMutation({
    onSuccess: () => utils.webhooks.getWebhook.invalidate({ fileId }),
    onError: (err) => toast.error(err.message),
  })
  const regenerateSecret = trpc.webhooks.regenerateSecret.useMutation({
    onSuccess: (data) => {
      setPlaintextSecret(data.secret)
      setShowNewSecret(true)
      toast.success("New secret generated")
    },
    onError: (err) => toast.error(err.message),
  })
  const deleteWebhook = trpc.webhooks.deleteWebhook.useMutation({
    onSuccess: () => {
      utils.webhooks.getWebhook.invalidate({ fileId })
      setDraftUrl("")
      setPlaintextSecret(null)
      setShowNewSecret(false)
      toast.success("Webhook removed")
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.upload.updateJson.useMutation({
    onSuccess: () => {
      toast.success("File updated")
      push("/dashboard/json")
    },
    onError: (err) => toast.error(err.message),
  })

  useEffect(() => {
    if (file) {
      form.setValue("filename", file.filename)
      form.setValue("jsonContent", file.content)
      setIsPublic(file.isPublic)
    }
  }, [file, form])

  const contentBytes = useMemo(
    () => bytes(watchedContent || ""),
    [watchedContent],
  )
  const sizePercent = Math.min((contentBytes / MAX_FILE_SIZE) * 100, 100)
  const jsonShape = useMemo(
    () => (watchedContent ? getJsonShape(watchedContent) : null),
    [watchedContent],
  )

  const formatJson = () => {
    try {
      const parsed = JSON.parse(watchedContent)
      form.setValue("jsonContent", JSON.stringify(parsed, null, 2))
      form.trigger("jsonContent")
    } catch {
      toast.error("Cannot format invalid JSON")
    }
  }

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(watchedContent)
      form.setValue("jsonContent", JSON.stringify(parsed))
      form.trigger("jsonContent")
    } catch {
      toast.error("Cannot minify invalid JSON")
    }
  }

  const handleSubmit = (data: FormData) => {
    if (contentBytes > MAX_FILE_SIZE) {
      toast.error("File exceeds 1MB size limit.")
      return
    }
    updateMutation.mutate({ id: fileId, ...data, isPublic })
  }

  const copyUrl = async () => {
    const fn = form.getValues("filename")
    if (!fn || !username) return
    const url = `${window.location.origin}/${username}/${fn}`
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
    <div className="max-w-2xl p-5">
      <Link
        href="/dashboard/json"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to JSON Files
      </Link>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            form.handleSubmit(handleSubmit)()
          }
        }}
        className="space-y-8"
      >
        <FieldGroup>
          {/* JSON Content */}
          <Controller
            name="jsonContent"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="json-content">JSON Content</FieldLabel>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={formatJson}
                      disabled={!watchedContent}
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
                      disabled={!watchedContent}
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
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value)
                      form.trigger("jsonContent")
                    }}
                    rows={20}
                    spellCheck={false}
                    aria-invalid={fieldState.invalid || undefined}
                    className="w-full rounded-lg border-2 bg-transparent p-3 font-mono text-sm transition-colors placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                  />
                </div>
                <FieldDescription>Edit JSON content above</FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Size indicator */}
          {watchedContent && (
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
                  aria-invalid={fieldState.invalid || undefined}
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

        {/* Webhook */}
        <FieldGroup>
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Webhook className="size-4" />
              Webhook
            </FieldLabel>
            {!webhook ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a POST request to a URL when this file is updated
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/webhook"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!draftUrl) return
                      upsertWebhook.mutate({ fileId, url: draftUrl })
                    }}
                    disabled={!draftUrl || upsertWebhook.isPending}
                    className="shrink-0"
                  >
                    Setup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border px-4 py-3">
                {showNewSecret && plaintextSecret && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium text-primary">
                        Webhook Secret — copy it now, it won't be shown again
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowNewSecret(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
                        {plaintextSecret}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(plaintextSecret)
                          toast.success("Secret copied")
                        }}
                        className="shrink-0 gap-1 text-xs"
                      >
                        <Copy className="size-3" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {webhook.url}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {webhook.lastDeliveryAt && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          webhook.lastDeliveryStatus === "success"
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        {webhook.lastDeliveryStatus === "success" ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                        {webhook.lastDeliveryResponseCode ?? "ERR"}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-enabled={webhook.enabled || undefined}
                      onClick={() => toggleWebhook.mutate({ fileId })}
                      disabled={toggleWebhook.isPending}
                      className="gap-1.5 text-xs data-enabled:text-primary"
                    >
                      {webhook.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateSecret.mutate({ fileId })}
                    disabled={regenerateSecret.isPending}
                    className="gap-1.5"
                  >
                    <RefreshCcw className="size-3.5" />
                    Regenerate Secret
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWebhook.mutate({ fileId })}
                    disabled={deleteWebhook.isPending}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Secret: {webhook.secretMasked}
                </p>
              </div>
            )}
          </Field>
        </FieldGroup>

        {/* URL Preview */}
        {username && (
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
              /{username}/{form.watch("filename") || "..."}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={
                contentBytes > MAX_FILE_SIZE || updateMutation.isPending
              }
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/json">Cancel</Link>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Press {isMac ? "⌘" : "Ctrl"}+Enter to save
          </p>
        </div>
      </form>
    </div>
  )
}
