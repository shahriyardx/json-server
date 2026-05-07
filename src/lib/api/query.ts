import crypto from "crypto"

export function traverse(data: unknown, segments: string[]): unknown {
  let current = data
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10)
      if (!Number.isNaN(index)) {
        current = current[index]
      } else {
        current = current.find((item) => {
          if (typeof item !== "object" || item === null) return false
          const idVal =
            (item as Record<string, unknown>)["_id"] ??
            (item as Record<string, unknown>)["id"]
          if (idVal === undefined) return false
          return String(idVal) === segment
        })
      }
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

export function applyQueryParams(
  data: unknown,
  params: URLSearchParams,
): unknown {
  if (!Array.isArray(data)) return data

  let result: unknown[] = data

  const search = params.get("search")
  if (search) {
    const term = search.toLowerCase()
    result = result.filter((item) => {
      if (typeof item === "string") return item.toLowerCase().includes(term)
      if (typeof item === "object" && item !== null) {
        return Object.values(item as Record<string, unknown>).some((v) =>
          String(v).toLowerCase().includes(term),
        )
      }
      return String(item).toLowerCase().includes(term)
    })
  }

  const filterParam = params.get("filter")
  if (filterParam) {
    const colonIdx = filterParam.indexOf(":")
    if (colonIdx > 0) {
      const key = filterParam.slice(0, colonIdx)
      const value = filterParam.slice(colonIdx + 1)
      result = result.filter((item) => {
        if (typeof item === "object" && item !== null) {
          return String((item as Record<string, unknown>)[key]) === value
        }
        return false
      })
    }
  }

  for (const [key, value] of params.entries()) {
    if (
      [
        "search",
        "sort",
        "order",
        "filter",
        "api_key",
        "_limit",
        "_start",
        "_end",
        "_skip",
      ].includes(key)
    )
      continue
    result = result.filter((item) => {
      if (typeof item === "object" && item !== null) {
        return String((item as Record<string, unknown>)[key]) === value
      }
      return false
    })
  }

  const sort = params.get("sort")
  if (sort) {
    const order = params.get("order") === "desc" ? -1 : 1
    result = result.toSorted((a, b) => {
      if (typeof a !== "object" || a === null) return 0
      if (typeof b !== "object" || b === null) return 0
      const aVal = (a as Record<string, string | number>)[sort]
      const bVal = (b as Record<string, string | number>)[sort]
      if (aVal < bVal) return -1 * order
      if (aVal > bVal) return 1 * order
      return 0
    })
  }

  const skip = params.get("_skip")
  const startParam = skip || params.get("_start")
  const end = params.get("_end")
  if (startParam || end) {
    const s = parseInt(startParam || "0", 10)
    const e = end ? parseInt(end, 10) : result.length
    result = result.slice(s, e)
  }

  const limit = params.get("_limit")
  if (limit) {
    result = result.slice(0, parseInt(limit, 10))
  }

  return result
}

export function autoGenerateId(
  data: unknown[],
): { value: string | number; key: string } | null {
  let hasId = false
  let allNumeric = true
  let maxNumeric = 0
  let detectedKey = "id"

  for (const item of data) {
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    const idVal = record._id ?? record.id
    if (idVal === undefined) continue

    hasId = true
    if (record._id !== undefined) detectedKey = "_id"
    if (typeof idVal === "number") {
      maxNumeric = Math.max(maxNumeric, idVal)
    } else {
      allNumeric = false
    }
  }

  if (!hasId) return null
  return {
    value: allNumeric ? maxNumeric + 1 : crypto.randomUUID(),
    key: detectedKey,
  }
}

export function findArrayIndex(data: unknown[], id: string): number {
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (typeof item !== "object" || item === null) continue
    const idVal =
      (item as Record<string, unknown>)["_id"] ??
      (item as Record<string, unknown>)["id"]
    if (idVal === undefined) continue
    if (String(idVal) === id) return i
  }
  return -1
}

const FILTER_RESERVED = new Set([
  "search",
  "sort",
  "order",
  "filter",
  "api_key",
  "_limit",
  "_start",
  "_end",
  "_skip",
])

export function hasFilterParams(params: URLSearchParams): boolean {
  if (params.has("search") || params.has("filter")) return true
  for (const [key] of params.entries()) {
    if (!FILTER_RESERVED.has(key)) return true
  }
  return false
}

export function collectMatchingIndices(
  data: unknown[],
  params: URLSearchParams,
): number[] {
  const indices: number[] = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>

    let match = true

    const search = params.get("search")
    if (search && match) {
      const term = search.toLowerCase()
      match = Object.values(record).some((v) =>
        String(v).toLowerCase().includes(term),
      )
    }

    const filterParam = params.get("filter")
    if (filterParam && match) {
      const colonIdx = filterParam.indexOf(":")
      if (colonIdx > 0) {
        const key = filterParam.slice(0, colonIdx)
        const value = filterParam.slice(colonIdx + 1)
        match = String(record[key]) === value
      }
    }

    if (match) {
      for (const [key, value] of params.entries()) {
        if (FILTER_RESERVED.has(key)) continue
        match = String(record[key]) === value
        if (!match) break
      }
    }

    if (match) indices.push(i)
  }

  return indices
}
