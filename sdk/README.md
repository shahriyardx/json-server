# json-sdk

TypeScript client for [json-server](https://json.shahriyar.dev) — turn JSON files into REST APIs.

```bash
npm install json-sdk
```

## Usage

```ts
import { JsonSDK } from "json-sdk"

const api = new JsonSDK({
  baseUrl: "https://json.shahriyar.dev",
  apiKey: "your-api-key",
})

// Fetch with query params
const products = await api.get("products", {
  filter: { categoryId: "1" },
  sort: "price",
  order: "desc",
  limit: 10,
})

// Type-safe
type User = { id: number; name: string; email: string }
const users = await api.get<User[]>("users", { search: "john" })

// Deep path access
const comments = await api.get("posts/1/comments")

// Create
const newProduct = await api.post("products", { name: "Phone", price: 599 })

// Update (by ID segment)
const updated = await api.patch("products/1", { price: 499 })

// Update (filtered)
const updated = await api.patch("products", { price: 0 }, { filter: { stock: "0" } })

// Delete (by ID)
await api.del("products/1")

// Delete (filtered)
await api.del("products", { filter: { status: "archived" } })
```

## API

### `new JsonSDK(options)`

| Option | Required | Description |
|--------|----------|-------------|
| `baseUrl` | yes | Your instance URL (e.g. `https://json.shahriyar.dev`) |
| `apiKey` | no | API key for private files and write operations |

### Methods

#### `get<T>(path, params?)`

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
