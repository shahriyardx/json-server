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

## Client

### `new JsonSDK(options)`

| Option | Required | Description |
|--------|----------|-------------|
| `baseUrl` | yes | Your instance URL |
| `apiKey` | no | API key for private files and writes |

## Methods

### `get<T>(path, params?)`

Fetch data with optional query parameters.

```ts
const products = await api.get("products")
const users = await api.get<User[]>("users", { search: "john" })
```

| Param | Type | Description |
|-------|------|-------------|
| `search` | `string` | Search across string values |
| `filter` | `Record<string, string>` | Filter by key:value |
| `sort` | `string` | Sort field |
| `order` | `"asc" \| "desc"` | Sort direction |
| `limit` | `number` | Limit results |
| `start` | `number` | Slice start |
| `end` | `number` | Slice end |
| `skip` | `number` | Skip N results |

### `post<T>(path, body)`

Add an item to an array.

```ts
const product = await api.post("products", {
  name: "Phone",
  price: 599,
})
```

### `patch<T>(path, body, params?)`

Update an item by ID or with filters.

```ts
// By ID
await api.patch("products/1", { price: 499 })

// With filter
await api.patch("products", { inStock: false }, {
  filter: { stock: "0" },
})
```

### `del<T>(path, params?)`

Delete an item by ID or with filters.

```ts
// By ID
await api.del("products/1")

// With filter
await api.del("products", { filter: { status: "archived" } })
```

## TypeScript

All methods accept a type parameter.

```ts
type Product = { id: number; name: string; price: number }

const products = await api.get<Product[]>("products")
const product = await api.post<Product>("products", { name: "New", price: 10 })
```

## Error Handling

```ts
import { ApiError } from "json-sdk"

try {
  await api.get("products")
} catch (err) {
  if (err instanceof ApiError) {
    console.log(err.status, err.message) // 404, "Not found"
  }
}
```
