import bcrypt from "bcryptjs"

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function parseBasicAuth(
  header: string,
): { username: string; password: string } | null {
  const encoded = header.slice("Basic ".length).trim()
  try {
    const decoded = atob(encoded)
    const colonIdx = decoded.indexOf(":")
    if (colonIdx === -1) return null
    return {
      username: decoded.slice(0, colonIdx),
      password: decoded.slice(colonIdx + 1),
    }
  } catch {
    return null
  }
}
