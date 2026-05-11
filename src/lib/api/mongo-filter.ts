import { evaluateExpression } from "./mongo-expr"

export function applyMongoFilter(
  data: unknown[],
  filter: Record<string, unknown>,
  vars?: Record<string, unknown>,
): unknown[] {
  if (!filter || Object.keys(filter).length === 0) return data
  return data.filter((item) => {
    if (typeof item !== "object" || item === null) return false
    return matchFilter(item as Record<string, unknown>, filter, vars)
  })
}

function matchFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown>,
  vars?: Record<string, unknown>,
): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    if (key.startsWith("$")) {
      if (key === "$and") {
        if (
          !Array.isArray(condition) ||
          !(condition as unknown[]).every((f) =>
            matchFilter(item, f as Record<string, unknown>, vars),
          )
        )
          return false
      } else if (key === "$or") {
        if (
          !Array.isArray(condition) ||
          !(condition as unknown[]).some((f) =>
            matchFilter(item, f as Record<string, unknown>, vars),
          )
        )
          return false
      } else if (key === "$nor") {
        if (
          !Array.isArray(condition) ||
          (condition as unknown[]).some((f) =>
            matchFilter(item, f as Record<string, unknown>, vars),
          )
        )
          return false
      } else if (key === "$expr") {
        const result = evaluateExpression(item, condition, vars)
        if (result !== true) return false
      } else if (key === "$text") {
        const searchSpec = condition as Record<string, unknown> | undefined
        const searchStr = String(searchSpec?.$search ?? "").trim()
        if (!searchStr) return false
        if (!matchTextSearch(item, searchStr)) return false
      }
    } else {
      if (!matchField(item, key, condition)) return false
    }
  }
  return true
}

function matchField(
  item: Record<string, unknown>,
  field: string,
  condition: unknown,
  vars?: Record<string, unknown>,
): boolean {
  // Nested field path like "address.city"
  if (field.includes(".")) {
    const parts = field.split(".")
    let current: unknown = item
    for (const part of parts) {
      if (typeof current !== "object" || current === null) return false
      current = (current as Record<string, unknown>)[part]
    }
    return matchPrimitive(current, condition, vars)
  }

  // Non-operator condition — direct equality or sub-document match
  if (typeof condition !== "object" || condition === null || Array.isArray(condition)) {
    return (item[field] as unknown) === condition
  }

  const cond = condition as Record<string, unknown>
  const keys = Object.keys(cond)
  const isOperator = keys.length > 0 && keys.every((k) => k.startsWith("$"))

  if (!isOperator) {
    // Embedded document match
    return matchSubDocument(item[field], cond, vars)
  }

  const value = item[field]

  // Handle $regex + $options as a pair
  if ("$regex" in cond) {
    if (!compareOpRegex(value, cond.$regex, cond.$options as string | undefined))
      return false
  }

  for (const [op, opVal] of Object.entries(cond)) {
    if (op === "$regex" || op === "$options") continue
    if (!compareOp(value, op, opVal, vars)) return false
  }
  return true
}

function matchPrimitive(value: unknown, condition: unknown, vars?: Record<string, unknown>): boolean {
  if (typeof condition !== "object" || condition === null || Array.isArray(condition)) {
    return value === condition
  }
  const cond = condition as Record<string, unknown>
  const keys = Object.keys(cond)
  const isOperator = keys.length > 0 && keys.every((k) => k.startsWith("$"))

  if (!isOperator) {
    return matchSubDocument(value, cond, vars)
  }

  if ("$regex" in cond) {
    if (!compareOpRegex(value, cond.$regex, cond.$options as string | undefined))
      return false
  }

  for (const [op, opVal] of Object.entries(cond)) {
    if (op === "$regex" || op === "$options") continue
    if (!compareOp(value, op, opVal, vars)) return false
  }
  return true
}

function matchSubDocument(
  value: unknown,
  subFilter: Record<string, unknown>,
  vars?: Record<string, unknown>,
): boolean {
  if (typeof value !== "object" || value === null) return false
  return matchFilter(value as Record<string, unknown>, subFilter, vars)
}

function matchTextSearch(
  item: Record<string, unknown>,
  searchStr: string,
): boolean {
  // Parse tokens: quoted phrases, negated terms, positive terms
  const phrases: string[] = []
  const negated: string[] = []
  const terms: string[] = []
  const re = /"([^"]+)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(searchStr)) !== null) {
    if (m[1]) {
      phrases.push(m[1].toLowerCase())
    } else {
      const token = m[2]
      if (token.startsWith("-")) {
        negated.push(token.slice(1).toLowerCase())
      } else {
        terms.push(token.toLowerCase())
      }
    }
  }

  // Collect all string-representable values
  const textValues: string[] = []
  for (const val of Object.values(item)) {
    if (typeof val === "string") textValues.push(val.toLowerCase())
    else if (typeof val === "number" || typeof val === "boolean")
      textValues.push(String(val).toLowerCase())
    else if (val != null) textValues.push(String(val).toLowerCase())
  }
  if (textValues.length === 0) return false

  // All quoted phrases must appear as substring
  for (const phrase of phrases) {
    if (!textValues.some((t) => t.includes(phrase))) return false
  }

  // Tokenize all text into word set for word-level checks
  const words = new Set<string>()
  for (const tv of textValues) {
    for (const w of tv.split(/[^a-z0-9]+/)) {
      if (w) words.add(w)
    }
  }

  // Negated terms must not appear as words
  for (const neg of negated) {
    if (words.has(neg)) return false
  }

  // No positive terms → phrase-only query, already passed
  if (terms.length === 0) return true

  // At least one positive term must appear as word
  return terms.some((t) => words.has(t))
}

function compareOpRegex(value: unknown, pattern: unknown, options?: string): boolean {
  if (typeof pattern !== "string" || typeof value !== "string") return false
  try {
    return new RegExp(pattern, options ?? "").test(value)
  } catch {
    return false
  }
}

function compareOp(value: unknown, operator: string, expected: unknown, vars?: Record<string, unknown>): boolean {
  switch (operator) {
    case "$eq":
      return value === expected
    case "$ne":
      return value !== expected
    case "$gt":
      return typeof value === "number" && typeof expected === "number" && value > expected
    case "$gte":
      return typeof value === "number" && typeof expected === "number" && value >= expected
    case "$lt":
      return typeof value === "number" && typeof expected === "number" && value < expected
    case "$lte":
      return typeof value === "number" && typeof expected === "number" && value <= expected
    case "$in":
      return Array.isArray(expected) && expected.includes(value)
    case "$nin":
      return Array.isArray(expected) && !expected.includes(value)
    case "$exists":
      return expected === true ? value !== undefined : value === undefined
    case "$type": {
      const typeMap: Record<string, string> = {
        string: "string",
        number: "number",
        boolean: "boolean",
        object: "object",
        array: "array",
        null: "null",
      }
      const targetType = typeMap[String(expected)] ?? String(expected)
      const actualType = Array.isArray(value)
        ? "array"
        : value === null
          ? "null"
          : typeof value
      return actualType === targetType
    }
    case "$mod":
      if (!Array.isArray(expected) || expected.length !== 2) return false
      return (
        typeof value === "number" &&
        value % (expected[0] as number) === (expected[1] as number)
      )
    case "$all":
      if (!Array.isArray(value) || !Array.isArray(expected)) return false
      return (expected as unknown[]).every((e) => (value as unknown[]).includes(e))
    case "$size":
      return Array.isArray(value) && typeof expected === "number" && value.length === expected
    case "$elemMatch": {
      if (!Array.isArray(value) || typeof expected !== "object" || expected === null)
        return false
      return (value as unknown[]).some((elem) => {
        if (typeof elem !== "object" || elem === null) return false
        return matchFilter(elem as Record<string, unknown>, expected as Record<string, unknown>, vars)
      })
    }
    case "$not":
      // Non-object literal → negated equality check
      if (typeof expected !== "object" || expected === null) {
        return value !== expected
      }
      // Evaluate inner condition against synthetic doc and negate
      return !matchField(
        { "": value } as Record<string, unknown>,
        "",
        expected,
        vars,
      )
    default:
      return false
  }
}
