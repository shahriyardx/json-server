import type { MetadataRoute } from "next"
import { getAllDocs } from "@/lib/docs"

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = getAllDocs()

  const staticPages = [
    {
      url: "https://json.shahriyar.dev",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 1,
    },
    {
      url: "https://json.shahriyar.dev/docs",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: "https://json.shahriyar.dev/privacy",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
  ]

  const docPages = docs.map((doc) => ({
    url: `https://json.shahriyar.dev/docs/${doc.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [...staticPages, ...docPages]
}
