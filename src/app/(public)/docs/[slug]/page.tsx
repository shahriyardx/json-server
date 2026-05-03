import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getDoc, getAllDocs } from "@/lib/docs"
import { DocContent } from "./content"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) return { title: "Not Found" }
  return { title: `${doc.title} — Documentation` }
}

export function generateStaticParams() {
  return getAllDocs().map((doc) => ({ slug: doc.slug }))
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) notFound()

  return <DocContent content={doc.content} />
}
