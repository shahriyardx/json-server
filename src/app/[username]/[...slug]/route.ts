import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const corsHeaders = { "Access-Control-Allow-Origin": "*" }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

async function getJsonFile(username: string, filename: string) {
  const user = await prisma.user.findFirst({ where: { username } })
  if (!user) return null

  return prisma.jsonFile.findUnique({
    where: { userId_filename: { userId: user.id, filename } },
  })
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
    result = [...result].sort((a, b) => {
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

  const jsonFile = await getJsonFile(username, filename)
  if (!jsonFile) {
    return json({ error: "Not found" }, 404)
  }

  let data: unknown
  try {
    data = JSON.parse(jsonFile.content)
  } catch {
    return NextResponse.json({ error: "Invalid JSON content" }, { status: 500 })
  }

  if (segments.length > 0) {
    data = traverse(data, segments)
    if (data === undefined) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const { searchParams } = new URL(req.url)
  data = applyQueryParams(data, searchParams)

  return NextResponse.json(data)
}
