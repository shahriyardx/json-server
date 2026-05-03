import { getAllDocs } from "@/lib/docs"
import { Container } from "@/components/container"
import { DocsSidebar } from "./sidebar"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = getAllDocs()

  return (
    <Container className="flex gap-8 py-12">
      <DocsSidebar docs={docs} />
      <main className="min-w-0 flex-1">{children}</main>
    </Container>
  )
}
