import crypto from "crypto"
import { NextResponse } from "next/server"
import { getJsonFile, updateFileContent } from "@/lib/api/file"
import { authenticateRequest } from "@/lib/api/auth"
import {
  rateLimiter,
  checkAndIncrementRequest,
  isAdminRole,
} from "@/lib/api/usage"
import { logFileRequest } from "@/lib/api/analytics"
import { json, ok, fail, cacheHeaders, corsHeaders } from "@/lib/api/response"
import {
  traverse,
  applyQueryParams,
  autoGenerateId,
  findArrayIndex,
  hasFilterParams,
  collectMatchingIndices,
} from "@/lib/api/query"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string; slug: string[] }> },
) {
  const { username, slug } = await params
  const [filename, ...segments] = slug

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) return json({ error: "Not found" }, 404)

  if (!isAdminRole(jsonFile.owner.role)) {
    const { ok: okRate } = rateLimiter.check(`${username}/${filename}`)
    if (!okRate) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } },
      )
    }
  }

  const isAuthed = await authenticateRequest(req, jsonFile.userId)
  if (!jsonFile.isPublic && !isAuthed) {
    return json({ error: "Forbidden. This file is private." }, 403)
  }

  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdminRole(jsonFile.owner.role) && !withinLimit)
    return json({ error: "Monthly request limit exceeded" }, 429)

  let data: unknown
  try {
    data = JSON.parse(jsonFile.content)
  } catch {
    return json({ error: "Invalid JSON content" }, 500)
  }

  if (segments.length > 0) {
    data = traverse(data, segments)
    if (data === undefined) return json({ error: "Not found" }, 404)
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

  if (!isAdminRole(jsonFile.owner.role)) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${filename}`)
    if (!rateOk) {
      return json({ success: false, error: "Too many requests" }, 429, {
        ...corsHeaders,
        "Retry-After": "60",
      })
    }
  }
  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdminRole(jsonFile.owner.role) && !withinLimit) {
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
        replacement[idKey] = (targetArray[idx] as Record<string, unknown>)[
          idKey
        ]
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
    if (data === undefined) return fail("Not found", 404)
  }

  if (!Array.isArray(data)) return fail("Target is not an array", 400)

  const bodyRecord = body as Record<string, unknown>
  if (bodyRecord._id === undefined && bodyRecord.id === undefined) {
    const generated = autoGenerateId(data)
    if (generated) {
      body = { ...bodyRecord, [generated.key]: generated.value }
    }
  }

  // Check duplicate _id/id
  const finalRecord = body as Record<string, unknown>
  const bodyIdKey =
    finalRecord._id !== undefined
      ? "_id"
      : finalRecord.id !== undefined
        ? "id"
        : null
  if (bodyIdKey) {
    const exists = (data as unknown[]).some((item) => {
      if (typeof item !== "object" || item === null) return false
      return (
        String((item as Record<string, unknown>)[bodyIdKey]) ===
        String(finalRecord[bodyIdKey])
      )
    })
    if (exists) return fail(`Duplicate ${bodyIdKey} value`, 409)
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

  if (!isAdminRole(jsonFile.owner.role)) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${filename}`)
    if (!rateOk) {
      return json({ success: false, error: "Too many requests" }, 429, {
        ...corsHeaders,
        "Retry-After": "60",
      })
    }
  }
  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdminRole(jsonFile.owner.role) && !withinLimit) {
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
    if (data === undefined) return fail("Not found", 404)
  }

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    Object.assign(data, body)
  } else if (Array.isArray(data)) {
    const { searchParams } = new URL(req.url)
    const indices = collectMatchingIndices(data, searchParams)
    for (const idx of indices) {
      Object.assign((data as unknown[])[idx] as Record<string, unknown>, body)
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

  if (!isAdminRole(jsonFile.owner.role)) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${filename}`)
    if (!rateOk) {
      return json({ success: false, error: "Too many requests" }, 429, {
        ...corsHeaders,
        "Retry-After": "60",
      })
    }
  }
  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!isAdminRole(jsonFile.owner.role) && !withinLimit) {
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
      if (targetArray === undefined) return fail("Not found", 404)
    }

    if (!Array.isArray(targetArray)) return fail("Target is not an array", 400)

    const indices = collectMatchingIndices(targetArray, searchParams)
    if (indices.length === 0) return fail("No matching items", 404)

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

  if (segments.length === 0) return fail("Item ID is required", 400)

  const idToDelete = segments[segments.length - 1]
  const pathToArray = segments.slice(0, -1)

  let targetArray = rootData
  if (pathToArray.length > 0) {
    targetArray = traverse(rootData, pathToArray)
    if (targetArray === undefined) return fail("Not found", 404)
  }

  if (!Array.isArray(targetArray)) return fail("Target is not an array", 400)

  const idx = findArrayIndex(targetArray, idToDelete)
  if (idx === -1) return fail("Item not found", 404)

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
