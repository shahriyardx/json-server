import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Admin JSON Files",
}

export default async function AdminJsonsPage() {
  const files = await prisma.jsonFile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, name: true } },
    },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">JSON Files</h1>
      <p className="mt-1 text-sm text-muted-foreground">{files.length} total files</p>

      <div className="mt-6 grid gap-3">
        {files.map((f) => {
          const size = new TextEncoder().encode(f.content).length
          const sizeLabel = size < 1024 ? `${size}B` : size < 1_048_576 ? `${(size / 1024).toFixed(0)}KB` : `${(size / 1_048_576).toFixed(1)}MB`
          return (
            <div
              key={f.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-medium">
                  {f.filename}.json
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {f.user.username ? (
                    <Link
                      href={`/dashboard/docs/${f.user.username}/${f.filename}`}
                      className="hover:text-foreground"
                    >
                      {f.user.username}
                    </Link>
                  ) : (
                    f.user.name
                  )}
                  {" · "}
                  {sizeLabel}
                  {" · "}
                  {new Date(f.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
