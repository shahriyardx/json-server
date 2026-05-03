import { getAllDocs } from "@/lib/docs"
import { DocsSidebar } from "./sidebar"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = getAllDocs()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-12">
      <DocsSidebar docs={docs} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
