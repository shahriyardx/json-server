import { getAllDocs } from "@/lib/docs"
import { Container } from "@/components/container"
import { DocsSidebar } from "./sidebar"
import { DocsMobileNav } from "./mobile-nav"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const docs = getAllDocs()

  return (
    <Container className="flex gap-8 py-12">
      <DocsSidebar docs={docs} />
      <main className="min-w-0 max-w-full flex-1">
        <DocsMobileNav docs={docs} />
        {children}
      </main>
    </Container>
  )
}
