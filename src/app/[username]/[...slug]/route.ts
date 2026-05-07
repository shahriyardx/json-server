import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { hashApiKey } from "@/lib/api-key"
import { fireWebhook } from "@/lib/webhook"

const MONTHLY_LIMIT = 100_000

const rateLimiter = rateLimit({ interval: 60_000, max: 60 })

const corsHeaders = { "Access-Control-Allow-Origin": "*" }

function json(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(data, {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  })
}

function ok(data: unknown, status = 200) {
  return json({ success: true, data }, status)
}

function fail(error: string, status: number) {
  return json({ success: false, error }, status)
}

function cacheHeaders(etag: string, updatedAt: Date) {
  return {
    ETag: `"${etag}"`,
    "Last-Modified": updatedAt.toUTCString(),
    "Cache-Control": "no-cache",
  }
}

async function getJsonFile(username: string, filename: string) {
  const user = await prisma.user.findFirst({
    where: { username },
    select: { id: true, role: true, banned: true },
  })
  if (!user || user.banned) return null

  const file = await prisma.jsonFile.findFirst({
    where: { userId: user.id, filename, deletedAt: null },
  })
  if (!file) return null

  return { ...file, owner: user }
}

async function authenticateRequest(
  req: Request,
  ownerUserId: string,
): Promise<boolean> {
  const authHeader = req.headers.get("authorization")
  let apiKey: string | null = null

  if (authHeader?.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7)
  } else {
    const url = new URL(req.url)
    apiKey = url.searchParams.get("api_key")
  }

  if (!apiKey) return false

  const keyHash = hashApiKey(apiKey)
  const found = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { userId: true },
  })
  if (!found || found.userId !== ownerUserId) return false

  prisma.apiKey
    .update({
      where: { keyHash },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  return true
}

async function checkAndIncrementRequest(userId: string): Promise<boolean> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const stats = await prisma.userMonthlyRequest.upsert({
    where: { userId_month_year: { userId, month, year } },
    create: { userId, month, year, count: 1 },
    update: { count: { increment: 1 } },
  })

  return stats.count <= MONTHLY_LIMIT
}

async function logFileRequest(fileId: string, referer: string | null) {
  const now = new Date()
  const date = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  )
  const referrerDomain = referer
    ? new URL(referer).hostname.replace(/^www\./, "")
    : "direct"

  await prisma.fileRequestLog.upsert({
    where: { fileId_date: { fileId, date } },
    create: { fileId, date, count: 1, referrers: { [referrerDomain]: 1 } },
    update: { count: { increment: 1 } },
  })

  // Update referrers separately — JSON merge not supported in Prisma
  const current = await prisma.fileRequestLog.findUnique({
    where: { fileId_date: { fileId, date } },
    select: { referrers: true },
  })
  if (current) {
    const refs = (current.referrers ?? {}) as Record<string, number>
    refs[referrerDomain] = (refs[referrerDomain] ?? 0) + 1
    await prisma.fileRequestLog.update({
      where: { fileId_date: { fileId, date } },
      data: { referrers: refs },
    })
  }
}

function traverse(data: unknown, segments: string[]): unknown {
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

function applyQueryParams(data: unknown, params: URLSearchParams): unknown {
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
    if (["search", "sort", "order", "filter", "api_key", "_limit", "_start", "_end", "_skip"].includes(key)) continue
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

function autoGenerateId(
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

function findArrayIndex(data: unknown[], id: string): number {
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
  "search", "sort", "order", "filter", "api_key",
  "_limit", "_start", "_end", "_skip",
])

function hasFilterParams(params: URLSearchParams): boolean {
  if (params.has("search") || params.has("filter")) return true
  for (const [key] of params.entries()) {
    if (!FILTER_RESERVED.has(key)) return true
  }
  return false
}

function collectMatchingIndices(
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

async function updateFileContent(
  fileId: string,
  content: string,
  filename: string,
  isPublic: boolean,
) {
  await prisma.jsonFile.update({
    where: { id: fileId },
    data: { content },
  })
  fireWebhook(prisma, fileId, filename, content, isPublic).catch(() => {})
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string; slug: string[] }> },
) {
  const { username, slug } = await params
  const [filename, ...segments] = slug

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) {
    return json({ error: "Not found" }, 404)
  }

  const isAdmin = jsonFile.owner.role === "admin" || jsonFile.owner.role === "superadmin"

  if (!isAdmin) {
    const { ok } = rateLimiter.check(`${username}/${filename}`)
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } },
      )
    }
  }

  const isAuthed = await authenticateRequest(req, jsonFile.userId)

  if (!jsonFile.isPublic) {
    if (!isAuthed) {
      return json({ error: "Forbidden. This file is private." }, 403)
    }
  }

  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdmin && !withinLimit) {
    return json({ error: "Monthly request limit exceeded" }, 429)
  }

  let data: unknown
  try {
    data = JSON.parse(jsonFile.content)
  } catch {
    return json({ error: "Invalid JSON content" }, 500)
  }

  if (segments.length > 0) {
    data = traverse(data, segments)
    if (data === undefined) {
      return json({ error: "Not found" }, 404)
    }
  }

  logFileRequest(jsonFile.id, req.headers.get("referer")).catch(() => {})

  const { searchParams } = new URL(req.url)
  data = applyQueryParams(data, searchParams)

  const etag = crypto
    .createHash("sha1")
    .update(JSON.stringify(data))
    .digest("hex")

  const ifNoneMatch = req.headers.get("if-none-match")
  if (ifNoneMatch === `"${etag}"`) {
    return new Response(null, {
      status: 304,
      headers: { ...corsHeaders, ...cacheHeaders(etag, jsonFile.updatedAt) },
    })
  }

  const ifModifiedSince = req.headers.get("if-modified-since")
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince)
    if (!Number.isNaN(since.getTime()) && jsonFile.updatedAt <= since) {
      return new Response(null, {
        status: 304,
        headers: { ...corsHeaders, ...cacheHeaders(etag, jsonFile.updatedAt) },
      })
    }
  }

  return json(data, 200, cacheHeaders(etag, jsonFile.updatedAt))
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string; slug: string[] }> },
) {
  const { username, slug } = await params
  const [filename, ...segments] = slug

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) return fail("Not found", 404)

  const isAuthed = await authenticateRequest(req, jsonFile.userId)
  if (!isAuthed) return fail("Unauthorized", 401)

  const isAdmin =
    jsonFile.owner.role === "admin" || jsonFile.owner.role === "superadmin"

  if (!isAdmin) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${filename}`)
    if (!rateOk) {
      return json(
        { success: false, error: "Too many requests" },
        429,
        { ...corsHeaders, "Retry-After": "60" },
      )
    }
  }

  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdmin && !withinLimit) {
    return fail("Monthly request limit exceeded", 429)
  }

  let rootData: unknown
  try {
    rootData = JSON.parse(jsonFile.content)
  } catch {
    return fail("Invalid JSON content", 500)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail("Invalid JSON body", 400)
  }

  // If segments end with an ID match, replace element entirely
  if (segments.length > 0) {
    const idSegment = segments[segments.length - 1]
    const pathToArray = segments.slice(0, -1)
    let targetArray = rootData
    if (pathToArray.length > 0) {
      targetArray = traverse(rootData, pathToArray)
    }
    if (Array.isArray(targetArray)) {
      const idx = findArrayIndex(targetArray, idSegment)
      if (idx !== -1) {
        const idKey =
          (targetArray[idx] as Record<string, unknown>)._id !== undefined
            ? "_id"
            : "id"
        const replacement = { ...(body as Record<string, unknown>) }
        delete replacement._id
        delete replacement.id
        replacement[idKey] = (targetArray[idx] as Record<string, unknown>)[idKey]
        targetArray[idx] = replacement
        const newContent = JSON.stringify(rootData)
        await updateFileContent(
          jsonFile.id,
          newContent,
          jsonFile.filename,
          jsonFile.isPublic,
        )
        return ok(replacement)
      }
      return fail("Item not found", 404)
    }
  }

  // Fall through to append logic
  let data = rootData
  if (segments.length > 0) {
    data = traverse(rootData, segments)
    if (data === undefined) {
      return fail("Not found", 404)
    }
  }

  if (!Array.isArray(data)) {
    return fail("Target is not an array", 400)
  }

  const bodyRecord = body as Record<string, unknown>
  if (bodyRecord._id === undefined && bodyRecord.id === undefined) {
    const generated = autoGenerateId(data)
    if (generated) {
      body = { ...bodyRecord, [generated.key]: generated.value }
    }
  }

  // Check duplicate _id/id
  const finalRecord = body as Record<string, unknown>
  const bodyIdKey = finalRecord._id !== undefined ? "_id" : finalRecord.id !== undefined ? "id" : null
  if (bodyIdKey) {
    const exists = (data as unknown[]).some((item) => {
      if (typeof item !== "object" || item === null) return false
      return String((item as Record<string, unknown>)[bodyIdKey]) === String(finalRecord[bodyIdKey])
    })
    if (exists) {
      return fail(`Duplicate ${bodyIdKey} value`, 409)
    }
  }

  ;(data as unknown[]).push(body)

  const newContent = JSON.stringify(rootData)
  await updateFileContent(
    jsonFile.id,
    newContent,
    jsonFile.filename,
    jsonFile.isPublic,
  )

  return ok(body, 201)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ username: string; slug: string[] }> },
) {
  const { username, slug } = await params
  const [filename, ...segments] = slug

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) return fail("Not found", 404)

  const isAuthed = await authenticateRequest(req, jsonFile.userId)
  if (!isAuthed) return fail("Unauthorized", 401)

  const isAdmin =
    jsonFile.owner.role === "admin" || jsonFile.owner.role === "superadmin"

  if (!isAdmin) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${filename}`)
    if (!rateOk) {
      return json(
        { success: false, error: "Too many requests" },
        429,
        { ...corsHeaders, "Retry-After": "60" },
      )
    }
  }

  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdmin && !withinLimit) {
    return fail("Monthly request limit exceeded", 429)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail("Invalid JSON body", 400)
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Body must be a JSON object", 400)
  }

  let rootData: unknown
  try {
    rootData = JSON.parse(jsonFile.content)
  } catch {
    return fail("Invalid JSON content", 500)
  }

  let data = rootData
  if (segments.length > 0) {
    data = traverse(rootData, segments)
    if (data === undefined) {
      return fail("Not found", 404)
    }
  }

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    Object.assign(data, body)
  } else if (Array.isArray(data)) {
    const { searchParams } = new URL(req.url)
    const indices = collectMatchingIndices(data, searchParams)
    for (const idx of indices) {
      Object.assign(
        (data as unknown[])[idx] as Record<string, unknown>,
        body,
      )
    }
  } else {
    return fail("Target must be an object or array", 400)
  }

  const newContent = JSON.stringify(rootData)
  await updateFileContent(
    jsonFile.id,
    newContent,
    jsonFile.filename,
    jsonFile.isPublic,
  )

  return ok(data)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ username: string; slug: string[] }> },
) {
  const { username, slug } = await params
  const [filename, ...segments] = slug

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) return fail("Not found", 404)

  const isAuthed = await authenticateRequest(req, jsonFile.userId)
  if (!isAuthed) return fail("Unauthorized", 401)

  const isAdmin =
    jsonFile.owner.role === "admin" || jsonFile.owner.role === "superadmin"

  if (!isAdmin) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${filename}`)
    if (!rateOk) {
      return json(
        { success: false, error: "Too many requests" },
        429,
        { ...corsHeaders, "Retry-After": "60" },
      )
    }
  }

  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdmin && !withinLimit) {
    return fail("Monthly request limit exceeded", 429)
  }

  const { searchParams } = new URL(req.url)

  let rootData: unknown
  try {
    rootData = JSON.parse(jsonFile.content)
  } catch {
    return fail("Invalid JSON content", 500)
  }

  if (hasFilterParams(searchParams)) {
    let targetArray = rootData
    if (segments.length > 0) {
      targetArray = traverse(rootData, segments)
      if (targetArray === undefined) {
        return fail("Not found", 404)
      }
    }

    if (!Array.isArray(targetArray)) {
      return fail("Target is not an array", 400)
    }

    const indices = collectMatchingIndices(targetArray, searchParams)
    if (indices.length === 0) {
      return fail("No matching items", 404)
    }

    indices.sort((a, b) => b - a)
    const removed: unknown[] = []
    for (const idx of indices) {
      removed.push((targetArray as unknown[]).splice(idx, 1)[0])
    }

    const newContent = JSON.stringify(rootData)
    await updateFileContent(
      jsonFile.id,
      newContent,
      jsonFile.filename,
      jsonFile.isPublic,
    )

    return ok(removed)
  }

  if (segments.length === 0) {
    return fail("Item ID is required", 400)
  }

  const idToDelete = segments[segments.length - 1]
  const pathToArray = segments.slice(0, -1)

  let targetArray = rootData
  if (pathToArray.length > 0) {
    targetArray = traverse(rootData, pathToArray)
    if (targetArray === undefined) {
      return fail("Not found", 404)
    }
  }

  if (!Array.isArray(targetArray)) {
    return fail("Target is not an array", 400)
  }

  const idx = findArrayIndex(targetArray, idToDelete)
  if (idx === -1) {
    return fail("Item not found", 404)
  }

  const [removed] = (targetArray as unknown[]).splice(idx, 1)

  const newContent = JSON.stringify(rootData)
  await updateFileContent(
    jsonFile.id,
    newContent,
    jsonFile.filename,
    jsonFile.isPublic,
  )

  return ok(removed)
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  })
}
