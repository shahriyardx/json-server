---
title: Public API
slug: public-api
order: 3
---

# Public API

Every uploaded JSON file is served as a public API endpoint.

## Base URL

```
GET /<username>/<filename>
```

Returns the full JSON content with `Content-Type: application/json`.

### Example

```
GET /johndoe/products
```

```json
[
  { "id": 1, "name": "Widget", "price": 9.99 },
  { "id": 2, "name": "Gadget", "price": 14.99 }
]
```

## Error Responses

| Status | Meaning |
|--------|---------|
| `404` | User, file, or nested path not found |
| `500` | Server error or invalid JSON content |

Errors return JSON:

```json
{ "error": "Not found" }
```
