---
title: Nested Paths
slug: nested-paths
order: 4
---

# Nested Paths

You can traverse into objects and arrays using URL path segments.

## Syntax

```
GET /<username>/<filename>/<key>/<index>/<nested-key>/...
```

## Examples

| URL | Returns |
|-----|---------|
| `/johndoe/products` | Full JSON array |
| `/johndoe/products/0` | First product |
| `/johndoe/products/0/name` | Name of first product |
| `/johndoe/config/theme/colors` | Deeply nested value |
| `/johndoe/store/inventory/items` | Nested array |
| `/johndoe/store/inventory/items/2/price` | Deeply nested value |

Returns `404 Not Found` if the path doesn't exist.

### Example

Given this JSON at `/johndoe/store`:

```json
{
  "name": "My Store",
  "inventory": {
    "items": [
      { "id": 1, "name": "Widget", "price": 9.99 },
      { "id": 2, "name": "Gadget", "price": 14.99 }
    ]
  }
}
```

| Request | Response |
|---------|----------|
| `GET /johndoe/store/inventory/items` | The full items array |
| `GET /johndoe/store/inventory/items/0` | The first item object |
| `GET /johndoe/store/inventory/items/0/name` | `"Widget"` |
| `GET /johndoe/store/name` | `"My Store"` |
