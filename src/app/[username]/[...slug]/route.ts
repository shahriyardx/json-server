import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { hashApiKey } from "@/lib/api-key"

const MONTHLY_LIMIT = 100_000

const rateLimiter = rateLimit({ interval: 60_000, max: 60 })

const corsHeaders = { "Access-Control-Allow-Origin": "*" }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

async function getJsonFile(username: string, filename: string) {
  const user = await prisma.user.findFirst({ where: { username } })
  if (!user) return null

  return prisma.jsonFile.findFirst({
    where: { userId: user.id, filename, deletedAt: null },
  })
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
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
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
    const refs = ((current.referrers ?? {}) as Record<string, number>)
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
      if (Number.isNaN(index)) return undefined
      current = current[index]
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
    if (["search", "sort", "order", "filter"].includes(key)) continue
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

  return result
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string; slug: string[] }> },
) {
  const { username, slug } = await params
  const [filename, ...segments] = slug

  const { ok } = rateLimiter.check(`${username}/${filename}`)
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } },
    )
  }

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) {
    return json({ error: "Not found" }, 404)
  }

  const isAuthed = await authenticateRequest(req, jsonFile.userId)

  if (!jsonFile.isPublic) {
    if (!isAuthed) {
      return json({ error: "Forbidden. This file is private." }, 403)
    }
  }

  const withinLimit = await checkAndIncrementRequest(jsonFile.userId)
  if (!withinLimit) {
    return json({ error: "Monthly request limit exceeded" }, 429)
  }

  // Fire-and-forget analytics logging
  logFileRequest(jsonFile.id, req.headers.get("referer")).catch(() => {})

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

  const { searchParams } = new URL(req.url)
  data = applyQueryParams(data, searchParams)

  return json(data)
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  })
}
