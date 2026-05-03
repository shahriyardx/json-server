import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function createContext(opts: { headers: Headers }) {
  const session = await auth.api.getSession({
    headers: opts.headers,
  })

  return {
    prisma,
    user: session?.user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
