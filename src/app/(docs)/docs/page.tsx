import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAllDocs } from "@/lib/docs"

export const metadata: Metadata = {
  title: "Documentation",
}

export default function DocsIndex() {
  const docs = getAllDocs()
  const first = docs[0]
  if (first) redirect(`/docs/${first.slug}`)
  return null
}
