import type { MongojsonAuth } from "./types"

export interface ParsedUri {
  username: string
  baseUrl: string
  auth: MongojsonAuth
  defaultDb: string | null
}

export function parseUri(uri: string): ParsedUri {
  const url = new URL(uri)

  // Extract platform username from host subdomain
  // e.g. shahriyardx.json.shahriyar.dev → username=shahriyardx, domain=json.shahriyar.dev
  // e.g. shahriyardx.localhost → username=shahriyardx, domain=localhost
  const hostParts = url.hostname.split(".")
  if (hostParts.length < 2) {
    throw new Error(
      "Host must include platform username as subdomain. " +
        'e.g. "username.json.shahriyar.dev" or "username.localhost"',
    )
  }
  const platformUser = hostParts[0]
  const domain = hostParts.slice(1).join(".")

  const protocol =
    domain === "localhost" || domain.startsWith("localhost:") || domain === "127.0.0.1" ? "http" : "https"
  const baseUrl = `${protocol}://${domain}${url.port ? `:${url.port}` : ""}`

  // Auth: Basic (user:password)
  if (!url.username || !url.password) {
    throw new Error(
      "URI must include database user:password, e.g. mongodb://dbuser:dbpass@host/db",
    )
  }
  const auth: MongojsonAuth = { username: url.username, password: url.password }

  const defaultDb = url.pathname.replace(/^\//, "") || null

  return { username: platformUser, baseUrl, auth, defaultDb }
}
