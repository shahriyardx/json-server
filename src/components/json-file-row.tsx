"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Copy,
  Check,
  Trash2,
  BookOpen,
  Pencil,
  Download,
  Eye,
  BarChart3,
  History,
  Lock,
  Unlock,
  FileJson,
  Calendar,
  Clock,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FileData {
  id: string
  filename: string
  content: string
  isPublic: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

interface JsonFileRowProps {
  file: FileData
  isExpanded: boolean
  origin: string
  username?: string
  copiedId: string | null
  highlightedSnippets: Record<string, string>
  isToggling: boolean
  onToggleExpand: () => void
  onCopyUrl: () => void
  onDownload: () => void
  onToggleVisibility: () => void
  onDelete: () => void
}

function computeSize(content: string) {
  const bytes = new TextEncoder().encode(content).length
  return {
    bytes,
    label: bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(0)}KB`,
  }
}

function contentType(file: FileData): string {
  try {
    const p = JSON.parse(file.content)
    if (Array.isArray(p)) return "array"
    if (typeof p === "object" && p !== null) return "object"
    return "other"
  } catch {
    return "other"
  }
}

export function JsonFileRow({
  file,
  isExpanded,
  origin,
  username,
  copiedId,
  highlightedSnippets,
  isToggling,
  onToggleExpand,
  onCopyUrl,
  onDownload,
  onToggleVisibility,
  onDelete,
}: JsonFileRowProps) {
  const [snippetCopied, setSnippetCopied] = useState(false)
  const size = computeSize(file.content)

  const copySnippet = async () => {
    const code = `const res = await fetch('${origin}/${username}/${file.filename}')
const data = await res.json()
console.log(data)`
    await navigator.clipboard.writeText(code)
    setSnippetCopied(true)
    setTimeout(() => setSnippetCopied(false), 2000)
  }

  return (
    <div className={cn("border-2", isExpanded && "bg-muted/30")}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleExpand}
            className="truncate font-mono text-sm font-medium text-white text-left cursor-pointer hover:underline"
          >
            {file.filename}.json
          </button>
          <span className="hidden sm:inline text-xs text-muted-foreground ml-auto">
            {size.label}
          </span>
          <span className="hidden sm:inline">
            <button
              type="button"
              onClick={onToggleVisibility}
              disabled={isToggling}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                file.isPublic
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {file.isPublic ? (
                <Unlock className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              {file.isPublic ? "Public" : "Private"}
            </button>
          </span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCopyUrl}
            title="Copy URL"
            className="hidden sm:inline-flex"
          >
            {copiedId === file.filename ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem onClick={onCopyUrl}>
                {copiedId === file.filename ? (
                  <Check className="mr-2 size-3" />
                ) : (
                  <Copy className="mr-2 size-3" />
                )}
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="mr-2 size-3" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/edit/${file.id}`}>
                  <Pencil className="mr-2 size-3" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/explore/${file.id}`}>
                  <Eye className="mr-2 size-3" />
                  Explore
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/analytics/${file.id}`}>
                  <BarChart3 className="mr-2 size-3" />
                  Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/versions/${file.id}`}>
                  <History className="mr-2 size-3" />
                  Versions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/docs/${username}/${file.filename}`}>
                  <BookOpen className="mr-2 size-3" />
                  Docs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 size-3" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleExpand}
            className="hidden sm:inline-flex"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </Button>
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t-2 bg-muted/20 px-8 py-5">
          <div className="grid grid-cols-2 gap-10">
            {/* Details */}
            <div>
              <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Details
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <FileJson className="size-4 shrink-0 text-muted-foreground" />
                  <span className="w-16 text-muted-foreground">Type:</span>
                  <span className="text-white capitalize">{contentType(file)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {file.isPublic ? (
                    <Unlock className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="w-16 text-muted-foreground">Status:</span>
                  <button
                    type="button"
                    onClick={onToggleVisibility}
                    disabled={isToggling}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                      file.isPublic
                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
                    )}
                  >
                    {file.isPublic ? "Public" : "Private"}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 shrink-0 text-muted-foreground" />
                  <span className="w-16 text-muted-foreground">Created:</span>
                  <span className="text-white">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="w-16 text-muted-foreground">Modified:</span>
                  <span className="text-white">
                    {new Date(file.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div>
              <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Actions
              </h4>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={onCopyUrl}>
                    <Copy className="mr-1 size-3" />
                    Copy URL
                  </Button>
                  <Button variant="outline" size="sm" onClick={onDownload}>
                    <Download className="mr-1 size-3" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/explore/${file.id}`}>
                      <Eye className="mr-1 size-3" />
                      Explore
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/analytics/${file.id}`}>
                      <BarChart3 className="mr-1 size-3" />
                      Analytics
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/docs/${username}/${file.filename}`}>
                      <BookOpen className="mr-1 size-3" />
                      Docs
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/versions/${file.id}`}>
                      <History className="mr-1 size-3" />
                      Versions
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/edit/${file.id}`}>
                      <Pencil className="mr-1 size-3" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-500"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* JS snippet */}
          {origin && username && (
            <div className="mt-6">
              <div className="relative">
                {highlightedSnippets[file.id] ? (
                  <div
                    className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0"
                    dangerouslySetInnerHTML={{ __html: highlightedSnippets[file.id] }}
                  />
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
                    <code>{`const res = await fetch('${origin}/${username}/${file.filename}')
const data = await res.json()
console.log(data)`}</code>
                  </pre>
                )}
                <button
                  type="button"
                  onClick={copySnippet}
                  className="absolute right-2 top-2 rounded border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {snippetCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
