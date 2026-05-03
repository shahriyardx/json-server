import { prisma } from "@/lib/prisma"
import Link from "next/link"

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

      <div className="mt-6 border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted text-left">
              <th className="px-4 py-2 font-medium text-muted-foreground">File</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Size</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => {
              const size = new TextEncoder().encode(f.content).length
              return (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{f.filename}.json</td>
                  <td className="px-4 py-2">
                    {f.user.username ? (
                      <Link
                        href={`/dashboard/docs/${f.user.username}/${f.filename}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {f.user.username}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{f.user.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {size < 1024 ? `${size}B` : size < 1_048_576 ? `${(size / 1024).toFixed(0)}KB` : `${(size / 1_048_576).toFixed(1)}MB`}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
