# json-sdk

TypeScript client for [json-server](https://json.shahriyar.dev) — turn JSON files into REST APIs.

```bash
npm install json-sdk
```

## Quick Start

Paths use `/username/filename` format since each user's files are namespaced under their GitHub username. Both `"/username/file"` and `"username/file"` are accepted — the SDK normalizes them.

```ts
import { JsonSDK } from "json-sdk"

const api = new JsonSDK({
  baseUrl: "https://json.shahriyar.dev",
  apiKey: "your-api-key", // required for private files and writes
})

// Fetch products with query params
const products = await api.get("/shahriyar/products", {
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
const products = await api.get("/alice/products")
const users = await api.get<User[]>("/alice/users", { search: "john" })
const comments = await api.get("/alice/posts/1/comments")
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
const product = await api.post("/alice/products", {
  name: "Phone",
  price: 599,
})
```

### `patch<T>(path, body, params?)`

Update items by ID segment or with filters. Requires auth.

```ts
// Update by ID
await api.patch("/alice/products/1", { price: 499 })

// Update matching items
await api.patch("/alice/products", { inStock: false }, {
  filter: { stock: "0" },
})
```

### `del<T>(path, params?)`

Delete items by ID segment or with filters. Requires auth.

```ts
// Delete by ID
await api.del("/alice/products/1")

// Delete matching items
await api.del("/alice/products", { filter: { status: "archived" } })
```

## TypeScript

All methods accept a type parameter for type-safe responses.

```ts
type Product = { id: number; name: string; price: number }

const products = await api.get<Product[]>("/alice/products")
const product = await api.post<Product>("/alice/products", {
  name: "Headphones",
  price: 199,
})
```

## Error Handling

```ts
import { JsonSDK, ApiError } from "json-sdk"

const api = new JsonSDK({ baseUrl: "https://json.shahriyar.dev" })

try {
  await api.get("/alice/products")
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
  baseUrl: "https://json.shahriyar.dev",
  apiKey: "key_abc123",
})
```

The key is sent via `Authorization: Bearer` header. You can also pass it as `?api_key=` query param. Required for private files and all write operations (POST, PATCH, DELETE).

## License

MIT
