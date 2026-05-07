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
      {/* Main row — whole row clickable to expand */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleExpand()
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="truncate font-mono text-sm font-medium text-foreground">
            {file.filename}.json
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground ml-auto">
            {size.label}
          </span>
          <span className="hidden sm:inline">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
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
            onClick={(e) => {
              e.stopPropagation()
              onCopyUrl()
            }}
            title="Copy URL"
            className="hidden sm:inline-flex"
          >
            {copiedId === file.filename ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="sm:hidden">
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
                  <Link href={`/dashboard/json/${file.id}/edit`}>
                    <Pencil className="mr-2 size-3" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/json/${file.id}`}>
                    <Eye className="mr-2 size-3" />
                    Explore
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/json/${file.id}/analytics`}>
                    <BarChart3 className="mr-2 size-3" />
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/json/${file.id}/versions`}>
                    <History className="mr-2 size-3" />
                    Versions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/json/${file.id}/docs`}>
                    <BookOpen className="mr-2 size-3" />
                    Docs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
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
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <FileJson className="size-3.5" />
                  Type:
                  <span className="text-foreground capitalize">
                    {contentType(file)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onToggleVisibility}
                  disabled={isToggling}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {file.isPublic ? (
                    <Unlock className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  Status:
                  <span
                    className={
                      file.isPublic ? "text-emerald-500" : "text-amber-500"
                    }
                  >
                    {file.isPublic ? "Public" : "Private"}
                  </span>
                </button>
                <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Calendar className="size-3.5" />
                  Created:
                  <span className="text-foreground">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Clock className="size-3.5" />
                  Modified:
                  <span className="text-foreground">
                    {new Date(file.updatedAt).toLocaleDateString()}
                  </span>
                </span>
              </div>
            </div>
            {/* Actions */}
            <div>
              <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Actions
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onCopyUrl}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  <Copy className="size-3.5" />
                  Copy URL
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  <Download className="size-3.5" />
                  Download
                </button>
                <Link
                  href={`/dashboard/json/${file.id}`}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="size-3.5" />
                  Explore
                </Link>
                <Link
                  href={`/dashboard/json/${file.id}/analytics`}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BarChart3 className="size-3.5" />
                  Analytics
                </Link>
                <Link
                  href={`/dashboard/json/${file.id}/docs`}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BookOpen className="size-3.5" />
                  Docs
                </Link>
                <Link
                  href={`/dashboard/json/${file.id}/versions`}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History className="size-3.5" />
                  Versions
                </Link>
                <Link
                  href={`/dashboard/json/${file.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-400 transition-colors text-left"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
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
                    dangerouslySetInnerHTML={{
                      __html: highlightedSnippets[file.id],
                    }}
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
