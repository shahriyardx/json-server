/**
 * MongoDB aggregation expression evaluator.
 * Supports ~45 operators: string, arithmetic, comparison, boolean, conditional, array, date, type.
 * Extracted to shared module so both `handleAggregate` and `$expr` in filters can use it.
 */

export function evaluateExpression(
  doc: Record<string, unknown>,
  expr: unknown,
  vars?: Record<string, unknown>,
): unknown {
  // Variable reference: $$varName → look up in vars
  if (typeof expr === "string" && expr.startsWith("$$")) {
    if (vars && expr.slice(2) in vars) return vars[expr.slice(2)]
    return undefined
  }

  // Field reference: $field or $nested.field
  if (typeof expr === "string" && expr.startsWith("$")) {
    const path = expr.slice(1)
    if (!path) return doc
    const parts = path.split(".")
    let current: unknown = doc
    for (const part of parts) {
      if (typeof current !== "object" || current === null) return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  if (Array.isArray(expr)) {
    return expr.map((e) => evaluateExpression(doc, e, vars))
  }

  if (typeof expr === "object" && expr !== null) {
    const keys = Object.keys(expr as Record<string, unknown>)
    if (keys.length > 0 && keys.every((k) => k.startsWith("$"))) {
      const firstKey = keys[0]
      const args = (expr as Record<string, unknown>)[firstKey]
      return evaluateOperator(firstKey, args, doc, vars)
    }
    return expr
  }

  return expr
}

function evaluateOperator(
  op: string,
  args: unknown,
  doc: Record<string, unknown>,
  vars?: Record<string, unknown>,
): unknown {
  const ev = (e: unknown) => evaluateExpression(doc, e, vars)
  const str = (e: unknown) => {
    const v = ev(e)
    return v == null ? "" : String(v)
  }
  const num = (e: unknown) => {
    const v = ev(e)
    return typeof v === "number" ? v : Number(v) || 0
  }
  const arr = (e: unknown) => {
    const v = ev(e)
    return Array.isArray(v) ? v : []
  }

  switch (op) {
    // --- String ---
    case "$concat":
      return (Array.isArray(args) ? args : [args]).map(str).join("")

    case "$toUpper": {
      const s = str(args)
      return s.toUpperCase()
    }

    case "$toLower": {
      const s = str(args)
      return s.toLowerCase()
    }

    case "$substr":
    case "$substrCP": {
      const a = Array.isArray(args) ? args : [args]
      const s = str(a[0])
      const start = Math.max(0, num(a[1]))
      const length = a.length > 2 ? num(a[2]) : s.length
      return s.slice(start, start + length)
    }

    case "$trim":
      return str(args).trim()
    case "$ltrim":
      return str(args).trimStart()
    case "$rtrim":
      return str(args).trimEnd()

    case "$strLenCP":
    case "$strLenBytes":
      return str(args).length

    // --- Arithmetic ---
    case "$add": {
      const a = Array.isArray(args) ? args : [args]
      return a.reduce((sum: number, e: unknown) => sum + num(e), 0)
    }

    case "$subtract": {
      const a = Array.isArray(args) ? args : [args]
      if (a.length < 2) return 0
      return num(a[0]) - num(a[1])
    }

    case "$multiply": {
      const a = Array.isArray(args) ? args : [args]
      return a.reduce((p: number, e: unknown) => p * num(e), 1)
    }

    case "$divide": {
      const a = Array.isArray(args) ? args : [args]
      if (a.length < 2) return 0
      const d = num(a[1])
      return d === 0 ? 0 : num(a[0]) / d
    }

    case "$mod": {
      const a = Array.isArray(args) ? args : [args]
      if (a.length < 2) return 0
      const m = num(a[1])
      return m === 0 ? 0 : num(a[0]) % m
    }

    case "$abs":
      return Math.abs(num(args))
    case "$ceil":
      return Math.ceil(num(args))
    case "$floor":
      return Math.floor(num(args))
    case "$round":
      return Math.round(num(args))
    case "$sqrt":
      return Math.sqrt(num(args))
    case "$pow": {
      const a = Array.isArray(args) ? args : [args]
      return a.length < 2 ? 0 : Math.pow(num(a[0]), num(a[1]))
    }

    // --- Comparison (return bool) ---
    case "$eq": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? ev(a[0]) === ev(a[1]) : false
    }
    case "$ne": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? ev(a[0]) !== ev(a[1]) : true
    }
    case "$gt": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? num(a[0]) > num(a[1]) : false
    }
    case "$gte": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? num(a[0]) >= num(a[1]) : false
    }
    case "$lt": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? num(a[0]) < num(a[1]) : false
    }
    case "$lte": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? num(a[0]) <= num(a[1]) : false
    }
    case "$cmp": {
      const a = Array.isArray(args) ? args : [args]
      if (a.length < 2) return 0
      const x = num(a[0])
      const y = num(a[1])
      return x < y ? -1 : x > y ? 1 : 0
    }

    // --- Boolean ---
    case "$and": {
      const a = Array.isArray(args) ? args : [args]
      return a.every((e: unknown) => !!ev(e))
    }
    case "$or": {
      const a = Array.isArray(args) ? args : [args]
      return a.some((e: unknown) => !!ev(e))
    }
    case "$not":
      return !ev(args)

    // --- Conditional ---
    case "$cond": {
      if (typeof args === "object" && args !== null && !Array.isArray(args)) {
        const condObj = args as Record<string, unknown>
        return !!ev(condObj.if) ? ev(condObj.then) : ev(condObj.else)
      }
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 3 ? (!!ev(a[0]) ? ev(a[1]) : ev(a[2])) : null
    }

    case "$ifNull": {
      const a = Array.isArray(args) ? args : [args]
      for (let i = 0; i < a.length - 1; i++) {
        const v = ev(a[i])
        if (v != null) return v
      }
      return a.length > 0 ? ev(a[a.length - 1]) : null
    }

    case "$switch": {
      const sw = args as Record<string, unknown> | undefined
      if (!sw) return null
      const branches = sw.branches as { case: unknown; then: unknown }[] | undefined
      if (!branches) return null
      for (const b of branches) {
        if (!!ev(b.case)) return ev(b.then)
      }
      return sw.default !== undefined ? ev(sw.default) : null
    }

    // --- Array ---
    case "$size":
      return arr(args).length

    case "$arrayElemAt": {
      const a = Array.isArray(args) ? args : [args]
      const ary = arr(a[0])
      const idx = num(a[1])
      return ary[idx < 0 ? ary.length + idx : idx]
    }

    case "$first":
      return arr(args)[0] ?? undefined

    case "$last":
      return arr(args)[arr(args).length - 1] ?? undefined

    case "$slice": {
      const a = Array.isArray(args) ? args : [args]
      const ary = arr(a[0])
      const startIdx = num(a[1])
      const count = a.length > 2 ? num(a[2]) : ary.length
      return ary.slice(startIdx, startIdx + count)
    }

    case "$in": {
      const a = Array.isArray(args) ? args : [args]
      return a.length >= 2 ? arr(a[1]).includes(ev(a[0])) : false
    }

    // --- Date ---
    case "$year": {
      const d = new Date(str(args))
      return Number.isNaN(d.getTime()) ? null : d.getFullYear()
    }
    case "$month": {
      const d = new Date(str(args))
      return Number.isNaN(d.getTime()) ? null : d.getMonth() + 1
    }
    case "$dayOfMonth": {
      const d = new Date(str(args))
      return Number.isNaN(d.getTime()) ? null : d.getDate()
    }
    case "$hour": {
      const d = new Date(str(args))
      return Number.isNaN(d.getTime()) ? null : d.getHours()
    }
    case "$minute": {
      const d = new Date(str(args))
      return Number.isNaN(d.getTime()) ? null : d.getMinutes()
    }
    case "$second": {
      const d = new Date(str(args))
      return Number.isNaN(d.getTime()) ? null : d.getSeconds()
    }

    case "$dateToString": {
      const spec = args as Record<string, unknown> | undefined
      if (!spec) return null
      const date = ev(spec.date)
      const d = new Date(str(date))
      if (Number.isNaN(d.getTime())) return null
      const format = String(spec.format ?? "%Y-%m-%d")
      return format
        .replace(/%Y/g, String(d.getFullYear()))
        .replace(/%m/g, String(d.getMonth() + 1).padStart(2, "0"))
        .replace(/%d/g, String(d.getDate()).padStart(2, "0"))
        .replace(/%H/g, String(d.getHours()).padStart(2, "0"))
        .replace(/%M/g, String(d.getMinutes()).padStart(2, "0"))
        .replace(/%S/g, String(d.getSeconds()).padStart(2, "0"))
    }

    // --- Type ---
    case "$toString":
      return str(args)
    case "$toInt":
    case "$toLong":
      return Math.trunc(num(args))
    case "$toDouble":
      return num(args)
    case "$type": {
      const v = ev(args)
      if (Array.isArray(v)) return "array"
      if (v === null) return "null"
      return typeof v
    }

    default:
      return undefined
  }
}
