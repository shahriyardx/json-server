import type { MetadataRoute } from "next"
import { getAllDocs } from "@/lib/docs"

const siteUrl = process.env.BETTER_AUTH_URL || "https://json.shahriyar.dev"

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = getAllDocs()

  const staticPages = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
  ]

  const docPages = docs.map((doc) => ({
    url: `${siteUrl}/docs/${doc.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [...staticPages, ...docPages]
}
