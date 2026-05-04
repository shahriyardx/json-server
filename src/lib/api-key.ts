import { randomBytes, createHash } from "node:crypto"

const KEY_PREFIX = "js_"

export function generateApiKey(): { plainKey: string; keyHash: string } {
  const raw = randomBytes(32).toString("hex")
  const plainKey = `${KEY_PREFIX}${raw}`
  const keyHash = createHash("sha256").update(plainKey).digest("hex")
  return { plainKey, keyHash }
}

export function hashApiKey(plainKey: string): string {
  return createHash("sha256").update(plainKey).digest("hex")
}
