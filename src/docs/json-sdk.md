---
title: JSON SDK
slug: json-sdk
order: 6
---

# JSON SDK

Official TypeScript client for the json-server API. Published as `json-sdk` on npm.

```bash
npm install json-sdk
```

## Quick Start

```ts
import { JsonSDK } from "json-sdk"

const api = new JsonSDK({
  baseUrl: "$BASE_URL",
  apiKey: "your-api-key", // required for private files and writes
})

// Fetch products with query params
const products = await api.get("products", {
  filter: { categoryId: "1" },
  sort: "price",
  order: "desc",
  limit: 10,
})
```

## Methods

### `get<T>(path, params?)`

Fetch data. Optionally filter, sort, search, and paginate.

```ts
const products = await api.get("products")
const users = await api.get<User[]>("users", { search: "john" })
const comments = await api.get("posts/1/comments")
```

| Param | Type | Description |
|-------|------|-------------|
| `search` | `string` | Search across all string values |
| `filter` | `Record<string, string>` | Filter by exact key:value match |
| `sort` | `string` | Field to sort by |
| `order` | `"asc" \| "desc"` | Sort direction |
| `limit` | `number` | Maximum results |
| `start` | `number` | Slice start index |
| `end` | `number` | Slice end index |
| `skip` | `number` | Skip N results |

### `post<T>(path, body)`

Add an item to an array. Requires auth.

```ts
const product = await api.post("products", {
  name: "Phone",
  price: 599,
})
```

### `patch<T>(path, body, params?)`

Update items by ID segment or with filters. Requires auth.

```ts
// Update by ID
await api.patch("products/1", { price: 499 })

// Update matching items
await api.patch("products", { inStock: false }, {
  filter: { stock: "0" },
})
```

### `del<T>(path, params?)`

Delete items by ID segment or with filters. Requires auth.

```ts
// Delete by ID
await api.del("products/1")

// Delete matching items
await api.del("products", { filter: { status: "archived" } })
```

## TypeScript

All methods accept a type parameter for type-safe responses.

```ts
type Product = { id: number; name: string; price: number }

const products = await api.get<Product[]>("products")
const product = await api.post<Product>("products", {
  name: "Headphones",
  price: 199,
})
```

## Error Handling

```ts
import { JsonSDK, ApiError } from "json-sdk"

const api = new JsonSDK({ baseUrl: "$BASE_URL" })

try {
  await api.get("products")
} catch (err) {
  if (err instanceof ApiError) {
    console.log(`HTTP ${err.status}: ${err.message}`)
  }
}
```

## Auth

Pass an API key in the constructor:

```ts
const api = new JsonSDK({
  baseUrl: "$BASE_URL",
  apiKey: "key_abc123",
})
```

The key is sent via `Authorization: Bearer` header. Required for private files and all write operations (POST, PATCH, DELETE).
