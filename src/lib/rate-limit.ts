import { LRUCache } from "lru-cache"

type RateLimitOptions = {
  interval: number
  max: number
}

export function rateLimit(options: RateLimitOptions) {
  const cache = new LRUCache<string, { count: number; resetAt: number }>({
    max: 10000,
    ttl: options.interval,
  })

  return {
    check: (key: string): { ok: boolean; remaining: number } => {
      const now = Date.now()
      const entry = cache.get(key)

      if (!entry || now > entry.resetAt) {
        cache.set(key, { count: 1, resetAt: now + options.interval })
        return { ok: true, remaining: options.max - 1 }
      }

      entry.count++
      if (entry.count > options.max) {
        return { ok: false, remaining: 0 }
      }

      return { ok: true, remaining: options.max - entry.count }
    },
  }
}
