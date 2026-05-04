"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Row = Record<string, unknown>

interface JsonDataTableProps {
  data: Row[]
}

export function JsonDataTable({ data }: JsonDataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filter, setFilter] = useState("")
  const [page, setPage] = useState(0)
  const perPage = 20

  const columns = useMemo(() => {
    const keySet = new Set<string>()
    for (const row of data) {
      for (const key of Object.keys(row)) {
        keySet.add(key)
      }
    }
    return Array.from(keySet)
  }, [data])

  const filtered = useMemo(() => {
    if (!filter) return data
    const term = filter.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(term)),
    )
  }, [data, filter])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const paged = sorted.slice(page * perPage, (page + 1) * perPage)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(0)
  }

  const formatCell = (val: unknown): string => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "object") return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter rows..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(0)
            }}
            className="pl-8 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {sorted.length} row{sorted.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted text-left">
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortKey === col ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                className="border-b last:border-0 hover:bg-muted/50"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {page * perPage + i + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-xs truncate px-3 py-2 font-mono text-xs"
                    title={formatCell(row[col])}
                  >
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
