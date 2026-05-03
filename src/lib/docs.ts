import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const DOCS_DIR = path.join(process.cwd(), "src/docs")

export type DocPage = {
  title: string
  slug: string
  order: number
  content: string
}

export function getAllDocs(): DocPage[] {
  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"))
  const pages: DocPage[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8")
    const { data, content } = matter(raw)
    return {
      title: data.title,
      slug: data.slug,
      order: data.order ?? 99,
      content,
    }
  })
  pages.sort((a, b) => a.order - b.order)
  return pages
}

export function getDoc(slug: string): DocPage | undefined {
  return getAllDocs().find((d) => d.slug === slug)
}
