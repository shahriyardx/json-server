"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

interface JsonTreeViewProps {
  data: unknown
  depth?: number
  label?: string
}

function isExpandable(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0
  if (typeof data === "object" && data !== null) {
    return Object.keys(data).length > 0
  }
  return false
}

export function JsonTreeView({ data, depth = 0, label }: JsonTreeViewProps) {
  if (depth > 10) {
    return <span className="text-muted-foreground">...</span>
  }

  if (data === null || data === undefined) {
    return (
      <span>
        {label && (
          <>
            <span className="font-mono text-xs font-medium">{label}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-muted-foreground">null</span>
      </span>
    )
  }

  if (typeof data === "string") {
    return (
      <span>
        {label && (
          <>
            <span className="font-mono text-xs font-medium">{label}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-primary">&quot;{data}&quot;</span>
      </span>
    )
  }

  if (typeof data === "number") {
    return (
      <span>
        {label && (
          <>
            <span className="font-mono text-xs font-medium">{label}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-amber-600 dark:text-amber-400">{data}</span>
      </span>
    )
  }

  if (typeof data === "boolean") {
    return (
      <span>
        {label && (
          <>
            <span className="font-mono text-xs font-medium">{label}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-purple-600 dark:text-purple-400">
          {String(data)}
        </span>
      </span>
    )
  }

  if (Array.isArray(data)) {
    return <JsonArrayView data={data} depth={depth} label={label} />
  }

  if (typeof data === "object") {
    return (
      <JsonObjectView
        data={data as Record<string, unknown>}
        depth={depth}
        label={label}
      />
    )
  }

  return <span>{String(data)}</span>
}

function JsonObjectView({
  data,
  depth,
  label,
}: {
  data: Record<string, unknown>
  depth: number
  label?: string
}) {
  const [collapsed, setCollapsed] = useState(depth >= 3)
  const entries = Object.entries(data)
  const indent = "ml-0"

  if (!entries.length)
    return (
      <span>
        {label && (
          <>
            <span className="font-mono text-xs font-medium">{label}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-muted-foreground">{`{}`}</span>
      </span>
    )

  const icon = collapsed ? (
    <ChevronRight className="size-3 shrink-0" />
  ) : (
    <ChevronDown className="size-3 shrink-0" />
  )

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="inline-flex items-baseline text-xs text-muted-foreground hover:text-foreground text-left"
      >
        <span className="inline-flex w-4 shrink-0 items-center justify-center mr-0.5">
          {icon}
        </span>
        {label && (
          <>
            <span className="font-mono font-medium text-foreground">
              {label}
            </span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className="font-medium">{`{${entries.length}}`}</span>
      </button>
      {!collapsed && (
        <div className="ml-4 space-y-0.5">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-baseline">
              {isExpandable(val) ? (
                <JsonTreeView data={val} depth={depth + 1} label={key} />
              ) : (
                <>
                  <span className="inline-flex w-4 shrink-0 items-center justify-center mr-0.5" />
                  <span className="font-mono text-xs font-medium">{key}</span>
                  <span className="text-muted-foreground">: </span>
                  <JsonTreeView data={val} depth={depth + 1} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}

function JsonArrayView({
  data,
  depth,
  label,
}: {
  data: unknown[]
  depth: number
  label?: string
}) {
  const [collapsed, setCollapsed] = useState(depth >= 3)
  const indent = "ml-0"

  if (!data.length)
    return (
      <span>
        {label && (
          <>
            <span className="font-mono text-xs font-medium">{label}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-muted-foreground">[]</span>
      </span>
    )

  const icon = collapsed ? (
    <ChevronRight className="size-3 shrink-0" />
  ) : (
    <ChevronDown className="size-3 shrink-0" />
  )

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="inline-flex items-baseline text-xs text-muted-foreground hover:text-foreground text-left"
      >
        <span className="inline-flex w-4 shrink-0 items-center justify-center mr-0.5">
          {icon}
        </span>
        {label && (
          <>
            <span className="font-mono font-medium text-foreground">
              {label}
            </span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className="font-medium">{`[${data.length}]`}</span>
      </button>
      {!collapsed && (
        <div className="ml-4 space-y-0.5">
          {data.map((item, i) => (
            <div key={`${i}-${typeof item}`} className="flex items-baseline">
              {isExpandable(item) ? (
                <JsonTreeView data={item} depth={depth + 1} label={String(i)} />
              ) : (
                <>
                  <span className="inline-flex w-4 shrink-0 items-center justify-center mr-0.5" />
                  <span className="mr-1 font-mono text-xs text-muted-foreground">
                    {i}:
                  </span>
                  <JsonTreeView data={item} depth={depth + 1} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}
