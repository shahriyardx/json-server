import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { DocClient } from "./doc-client"

type PathInfo = {
  path: string
  type: string
  description: string
}

function buildPaths(data: unknown, base = ""): PathInfo[] {
  const paths: PathInfo[] = []

  function walk(value: unknown, currentPath: string, depth: number) {
    if (Array.isArray(value)) {
      const first = value[0]
      paths.push({ path: currentPath || "/", type: `Array<${describeShape(first)}>`, description: `Array of ${describeShape(first)} (${value.length} items)` })
    } else if (typeof value === "object" && value !== null) {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const subPath = currentPath ? `${currentPath}/${key}` : `/${key}`
        const isObjOrArray = Array.isArray(val) || (typeof val === "object" && val !== null)
        if (depth === 0 || isObjOrArray) {
          paths.push({ path: subPath, type: describeShape(val), description: describeValue(val) })
        }
        if (depth < 1 && isObjOrArray && !Array.isArray(val)) {
          walk(val, subPath, depth + 1)
        }
      }
    }
  }

  walk(data, base, 0)
  return paths
}

function describeShape(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "Array"
  if (typeof value === "object") return "Object"
  return typeof value
}

function describeValue(value: unknown, maxLen = 60): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return `${value.length} items`
  if (typeof value === "object" && value !== null) return "Object"
  const str = String(value)
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str
}

function countArrays(data: unknown): number {
  if (Array.isArray(data)) return 1 + countArrays(data[0])
  if (typeof data === "object" && data !== null) {
    return (Object.values(data as Record<string, unknown>) as unknown[]).reduce<number>((sum, v) => sum + countArrays(v), 0)
  }
  return 0
}

export default async function JsonDocPage({
  params,
}: {
  params: Promise<{ username: string; filename: string }>
}) {
  const { username, filename } = await params

  const user = await prisma.user.findFirst({ where: { username } })
  if (!user) notFound()

  const jsonFile = await prisma.jsonFile.findUnique({
    where: { userId_filename: { userId: user.id, filename } },
  })
  if (!jsonFile) notFound()

  let data: unknown
  try {
    data = JSON.parse(jsonFile.content)
  } catch {
    notFound()
  }

  const paths = buildPaths(data)
  const hasArrays = countArrays(data) > 0
  const baseUrl = `/${username}/${filename}`

  return (
    <div className="min-h-screen">
      <div className="p-5">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{filename}.json</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            by <span className="font-medium text-foreground">{username}</span>
          </p>
        </div>

        <div className="mb-8 border">
          <div className="border-b bg-muted px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">BASE URL</span>
          </div>
          <div className="px-4 py-3">
            <code className="text-sm">{baseUrl}</code>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Available Paths</h2>
          <div className="border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Path</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Preview</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((p) => (
                  <tr key={p.path} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{p.path}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.type}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasArrays && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Query Parameters</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              These work on any path that returns an array.
            </p>
            <div className="border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Parameter</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Example</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">search</td>
                    <td className="px-4 py-2 font-mono text-xs">?search=phone</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Search across string values</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">filter</td>
                    <td className="px-4 py-2 font-mono text-xs">?filter=categoryId:1</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Filter by key:value pair</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">sort</td>
                    <td className="px-4 py-2 font-mono text-xs">?sort=price&order=desc</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Sort by field (asc/desc)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">key=value</td>
                    <td className="px-4 py-2 font-mono text-xs">?categoryId=2</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Direct filter by any field</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DocClient baseUrl={baseUrl} initialJson={JSON.stringify(data, null, 2)} />
      </div>
    </div>
  )
}
