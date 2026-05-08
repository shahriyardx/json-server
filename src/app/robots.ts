import type { MetadataRoute } from "next"

const siteUrl = process.env.BETTER_AUTH_URL || "https://json.shahriyar.dev"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/admin"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
