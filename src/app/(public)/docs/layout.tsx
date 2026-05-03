import Link from "next/link"
import { getAllDocs } from "@/lib/docs"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = getAllDocs()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-12">
      <aside className="hidden w-56 shrink-0 md:block">
        <nav className="sticky top-24 space-y-1">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Documentation
          </p>
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {doc.title}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
