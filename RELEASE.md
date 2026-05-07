## v0.2.0 — 2026-05-08

### json-sdk

New official TypeScript client for the json-server API. Published on npm as `json-sdk`.

```ts
import { createClient } from "json-sdk"

const api = createClient({
  baseUrl: "https://json.shahriyar.dev",
  apiKey: "your-api-key",
})

const products = await api.get("products", {
  filter: { categoryId: "1" },
  sort: "price",
  order: "desc",
  limit: 10,
})
```

Supports GET, POST, PATCH, DELETE with full query param support, auth, and TypeScript generics. Auto-published on every GitHub release via OIDC trusted publisher — no tokens needed.

### Chores

- Restored dashboard breadcrumb (removed during chat feature experiment)
- Excluded `sdk/` from Docker builds
