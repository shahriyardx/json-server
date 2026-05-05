"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { ChevronRight, ChevronDown, Copy, Check, Search, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type JsonPath = (string | number)[]

interface JsonExplorerProps {
  data: unknown
}

function isExpandable(val: unknown): boolean {
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === "object") return Object.keys(val as object).length > 0
  return false
}

function getValueLabel(val: unknown): { text: string; cls: string } {
  if (val === null) return { text: "null", cls: "text-muted-foreground" }
  if (typeof val === "string")
    return { text: `"${val}"`, cls: "text-green-600 dark:text-green-400" }
  if (typeof val === "number")
    return { text: String(val), cls: "text-amber-600 dark:text-amber-400" }
  if (typeof val === "boolean")
    return { text: String(val), cls: "text-purple-600 dark:text-purple-400" }
  return { text: String(val), cls: "" }
}

function getCollapsedLabel(val: unknown): { text: string; cls: string } {
  if (Array.isArray(val)) return { text: `[${val.length} items]`, cls: "text-muted-foreground" }
  if (typeof val === "object" && val !== null)
    return { text: `{${Object.keys(val).length} items}`, cls: "text-muted-foreground" }
  return getValueLabel(val)
}

const MAX_PREVIEW_ENTRIES = 6

function getEntries(data: unknown): [string | number, unknown][] {
  return Array.isArray(data)
    ? (data as unknown[]).map((item, i) => [i, item])
    : Object.entries(data as Record<string, unknown>)
}

// Walk tree and return paths that match search term
function getMatchingPaths(data: unknown, term: string): Set<string> {
  const matches = new Set<string>()
  const lower = term.toLowerCase()

  function walk(val: unknown, path: string): boolean {
    let localMatch = false
    if (typeof val === "string" && val.toLowerCase().includes(lower)) localMatch = true
    if (typeof val === "number" && String(val).includes(lower)) localMatch = true

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const childPath = path ? `${path}/${i}` : `/${i}`
        if (walk(val[i], childPath)) localMatch = true
      }
    } else if (typeof val === "object" && val !== null) {
      for (const [key, v] of Object.entries(val as Record<string, unknown>)) {
        if (key.toLowerCase().includes(lower)) localMatch = true
        const childPath = path ? `${path}/${key}` : `/${key}`
        if (walk(v, childPath)) localMatch = true
      }
    }

    if (localMatch) matches.add(path)
    return localMatch
  }

  walk(data, "")
  return matches
}

function parseJsonPath(input: string): JsonPath | null {
  let path = input.trim()
  if (!path) return null

  // Remove leading $. or just $
  if (path.startsWith("$.")) path = path.slice(2)
  else if (path.startsWith("$")) path = path.slice(1)
  // Remove leading /
  if (path.startsWith("/")) path = path.slice(1)

  if (!path) return []

  const segments: JsonPath = []
  // Split on . or / or [index]
  const parts = path.split(/(?=\[)|\.|\//).filter(Boolean)
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const idx = parseInt(trimmed.slice(1, -1), 10)
      if (!Number.isNaN(idx)) segments.push(idx)
      else segments.push(trimmed.slice(1, -1))
    } else {
      segments.push(trimmed)
    }
  }
  return segments
}

function traverseToPath(data: unknown, path: JsonPath): unknown {
  let current = data
  for (const segment of path) {
    if (current === null || current === undefined) return undefined
    if (typeof segment === "number" && Array.isArray(current)) {
      current = current[segment]
    } else if (typeof segment === "string" && typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

function pathToString(path: JsonPath): string {
  return "$" + path.map((s) => (typeof s === "number" ? `[${s}]` : `/${s}`)).join("")
}

export function JsonExplorer({ data }: JsonExplorerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [jsonPath, setJsonPath] = useState("")
  const [copiedPath, setCopiedPath] = useState("")
  const [focusPath, setFocusPath] = useState<JsonPath>([])
  const searchRef = useRef<HTMLInputElement>(null)

  const matchingPaths = useMemo(
    () => (search ? getMatchingPaths(data, search) : null),
    [data, search],
  )

  const clearSearch = useCallback(() => {
    setSearch("")
    searchRef.current?.focus()
  }, [])

  const expandAll = useCallback(() => {
    setCollapsed(new Set())
  }, [])

  const collapseAll = useCallback(() => {
    const allKeys = new Set<string>()
    function walk(val: unknown, path: string) {
      if (Array.isArray(val)) {
        if (val.length > 0) allKeys.add(path)
        val.forEach((item, i) => walk(item, path ? `${path}/${i}` : `/${i}`))
      } else if (typeof val === "object" && val !== null) {
        const entries = Object.entries(val as Record<string, unknown>)
        if (entries.length > 0) allKeys.add(path)
        for (const [key, v] of entries) {
          walk(v, path ? `${path}/${key}` : `/${key}`)
        }
      }
    }
    walk(data, "")
    setCollapsed(allKeys)
  }, [data])

  const handleCopyPath = useCallback(async (path: JsonPath) => {
    const str = pathToString(path)
    await navigator.clipboard.writeText(str)
    setCopiedPath(str)
    setTimeout(() => setCopiedPath(""), 1500)
  }, [])

  const handleJsonPathJump = useCallback(() => {
    const segments = parseJsonPath(jsonPath)
    if (!segments) return
    const result = traverseToPath(data, segments)
    if (result !== undefined) {
      setFocusPath(segments)
      setJsonPath(pathToString(segments))
      // Expand all parents
      const newCollapsed = new Set(collapsed)
      let currentPath = ""
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        currentPath = currentPath ? `${currentPath}/${seg}` : `/${seg}`
        newCollapsed.delete(currentPath)
      }
      setCollapsed(newCollapsed)
    }
  }, [data, jsonPath, collapsed])

  const toggle = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const isCollapsed = useCallback(
    (path: string) => collapsed.has(path),
    [collapsed],
  )

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            placeholder="Search JSON..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm h-8"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">
            Collapse All
          </Button>
        </div>
      </div>

      {/* JSON Path input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder='JSON Path (e.g. $.items[0].name or /items/0/name)'
            value={jsonPath}
            onChange={(e) => setJsonPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJsonPathJump()}
            className="pl-2.5 text-xs h-8 font-mono"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleJsonPathJump} className="h-8 text-xs gap-1">
          <ArrowRight className="size-3" />
          Jump
        </Button>
      </div>

      {/* Tree */}
      <div className="rounded-lg border p-4 bg-background overflow-auto max-h-[70vh]">
        <TreeNode
          data={data}
          path=""
          jsonPath={[]}
          isCollapsed={isCollapsed}
          onToggle={toggle}
          search={search}
          matchingPaths={matchingPaths}
          depth={0}
          onCopyPath={handleCopyPath}
          copiedPath={copiedPath}
          focusPath={focusPath}
        />
      </div>

      {copiedPath && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Check className="size-3 text-green-500" />
          Copied path: {copiedPath}
        </p>
      )}
    </div>
  )
}

// ─── Collapsed Preview ─────────────────────────────

function CollapsedPreview({
  entries,
  data,
}: {
  entries: [string | number, unknown][]
  data: unknown
}) {
  const isArray = Array.isArray(data)
  const previewCount = Math.min(entries.length, MAX_PREVIEW_ENTRIES)
  const remaining = entries.length - previewCount

  if (isArray) {
    return (
      <span className="ml-1">
        <span className="text-muted-foreground">
          {entries.slice(0, previewCount).map(([, val], i) => (
            <span key={i}>
              <CollapsedValue val={val} />
              {i < previewCount - 1 || remaining > 0 ? <span className="text-muted-foreground/50">, </span> : null}
            </span>
          ))}
          {remaining > 0 && <span> +{remaining} more</span>}
        </span>
      </span>
    )
  }

  return (
    <span className="ml-0.5">
      <span className="text-muted-foreground">
        {entries.slice(0, previewCount).map(([key, val], i) => (
          <span key={String(key)}>
            <span className="text-violet-600 dark:text-violet-400">&quot;{String(key)}&quot;</span>
            <span className="text-muted-foreground/50">: </span>
            <CollapsedValue val={val} />
            {i < previewCount - 1 || remaining > 0 ? <span className="text-muted-foreground/50">, </span> : null}
          </span>
        ))}
        {remaining > 0 && <span> +{remaining} more</span>}
      </span>
    </span>
  )
}

function CollapsedValue({ val }: { val: unknown }) {
  const label = getCollapsedLabel(val)
  return <span className={label.cls}>{label.text}</span>
}

// ─── TreeNode ──────────────────────────────────────

interface TreeNodeProps {
  data: unknown
  path: string
  jsonPath: JsonPath
  isCollapsed: (path: string) => boolean
  onToggle: (path: string) => void
  search: string
  matchingPaths: Set<string> | null
  depth: number
  onCopyPath: (path: JsonPath) => void
  copiedPath: string
  focusPath: JsonPath
}

function TreeNode({
  data,
  path,
  jsonPath,
  isCollapsed,
  onToggle,
  search,
  matchingPaths,
  depth,
  onCopyPath,
  copiedPath,
  focusPath,
}: TreeNodeProps) {
  // If search active and this path doesn't match, hide entirely
  if (matchingPaths && !matchingPaths.has(path) && depth > 0) return null

  const expandable = isExpandable(data)
  const collapsed = isCollapsed(path)

  // Leaf value — render inline
  if (!expandable) {
    const label = getValueLabel(data)
    return (
      <div
        className={`group flex items-baseline py-px hover:bg-muted/40 rounded-sm px-1 -mx-1 cursor-pointer ${copiedPath === pathToString(jsonPath) ? "bg-green-500/10" : ""}`}
        onClick={() => onCopyPath(jsonPath)}
        title="Copy path"
      >
        <Comma offset={0} />
        <span className="font-mono text-xs leading-6">{label.text}</span>
        <CopyIcon copiedPath={copiedPath} jsonPath={jsonPath} />
      </div>
    )
  }

  const count = Array.isArray(data)
    ? (data as unknown[]).length
    : Object.keys(data as Record<string, unknown>).length

  // Empty object/array
  if (count === 0) {
    const bracket = Array.isArray(data) ? "[]" : "{}"
    return (
      <div className="group flex items-baseline py-px hover:bg-muted/40 rounded-sm px-1 -mx-1">
        <Comma offset={0} />
        <span className="font-mono text-xs leading-6 text-muted-foreground">{bracket}</span>
      </div>
    )
  }

  const openBracket = Array.isArray(data) ? "[" : "{"
  const closeBracket = Array.isArray(data) ? "]" : "}"

  const entries: [string | number, unknown][] = Array.isArray(data)
    ? (data as unknown[]).map((item, i) => [i, item])
    : Object.entries(data as Record<string, unknown>)

  return (
    <div className="py-px">
      {/* Header row — collapsible toggle */}
      <div
        className="group flex items-baseline hover:bg-muted/40 rounded-sm px-1 -mx-1 cursor-pointer"
        onClick={() => onToggle(path)}
      >
        <span className="inline-flex w-4 shrink-0 items-center justify-center mr-0.5 text-muted-foreground">
          {collapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </span>
        {depth > 0 && <span className="text-muted-foreground"> </span>}
        <span className="font-mono text-xs leading-6">
          <span>{openBracket}</span>
          {collapsed ? (
            <CollapsedPreview entries={entries} data={data} />
          ) : (
            <span className="text-muted-foreground text-[10px] ml-1">{count}</span>
          )}
          <span>{closeBracket}</span>
        </span>
      </div>

      {/* Children */}
      {!collapsed && (
        <div className="ml-4 border-l border-border/40 pl-3">
          {entries.map(([key, val], i, arr) => {
            const childPath = path ? `${path}/${key}` : `/${key}`
            const childJsonPath = [...jsonPath, key]
            const isLast = i === arr.length - 1

            return (
              <div key={String(key)} className="flex">
                <span className="font-mono text-xs leading-6 text-violet-600 dark:text-violet-400 shrink-0">
                  {typeof key === "number" ? (
                    <span className="text-muted-foreground">{key}:</span>
                  ) : (
                    <span className="mr-1">{key}:</span>
                  )}
                </span>
                {isExpandable(val) ? (
                  <TreeNode
                    data={val}
                    path={childPath}
                    jsonPath={childJsonPath}
                    isCollapsed={isCollapsed}
                    onToggle={onToggle}
                    search={search}
                    matchingPaths={matchingPaths}
                    depth={depth + 1}
                    onCopyPath={onCopyPath}
                    copiedPath={copiedPath}
                    focusPath={focusPath}
                  />
                ) : (
                  <LeafValue
                    val={val}
                    path={childPath}
                    jsonPath={childJsonPath}
                    isLast={isLast}
                    onCopyPath={onCopyPath}
                    copiedPath={copiedPath}
                    matchingPaths={matchingPaths}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Closing bracket */}
      {!collapsed && (
        <div className="flex items-baseline py-px hover:bg-muted/40 rounded-sm px-1 -mx-1">
          <span className="inline-flex w-4 shrink-0 mr-0.5" />
          {depth > 0 && <span className="text-muted-foreground"> </span>}
          <span className="font-mono text-xs leading-6">{closeBracket}</span>
          <Comma offset={0} />
        </div>
      )}
    </div>
  )
}

function LeafValue({
  val,
  path,
  jsonPath,
  isLast,
  onCopyPath,
  copiedPath,
  matchingPaths,
}: {
  val: unknown
  path: string
  jsonPath: JsonPath
  isLast: boolean
  onCopyPath: (path: JsonPath) => void
  copiedPath: string
  matchingPaths: Set<string> | null
}) {
  if (matchingPaths && !matchingPaths.has(path)) return null

  const label = getValueLabel(val)
  const isCopied = copiedPath === pathToString(jsonPath)

  return (
    <div
      className={`group flex items-baseline min-w-0 hover:bg-muted/40 rounded-sm px-1 -mx-1 cursor-pointer ${isCopied ? "bg-green-500/10" : ""}`}
      onClick={() => onCopyPath(jsonPath)}
      title="Copy path"
    >
      <span
        className={`font-mono text-xs leading-6 truncate ${isCopied ? "text-green-500" : label.cls}`}
      >
        {label.text}
      </span>
      {!isLast && <span className="text-muted-foreground font-mono text-xs leading-6 shrink-0">,</span>}
      <CopyIcon copiedPath={copiedPath} jsonPath={jsonPath} />
    </div>
  )
}

function Comma({ offset }: { offset: number }) {
  return <span className={`text-muted-foreground font-mono text-xs leading-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1`} />
}

function CopyIcon({ copiedPath, jsonPath }: { copiedPath: string; jsonPath: JsonPath }) {
  const isCopied = copiedPath === pathToString(jsonPath)
  return (
    <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {isCopied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </span>
  )
}
