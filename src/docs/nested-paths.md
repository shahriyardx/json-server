---
title: Nested Paths & ID Matching
slug: nested-paths
order: 3
---

# Nested Paths & ID Matching

Traverse into objects and arrays using URL path segments.

## Object Traversal

Path segments resolve to object keys:

```
/<username>/<filename>/key1/key2
```

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

::api-example{method="GET" path="/johndoe/store"}
::

::api-example{method="GET" path="/johndoe/store/name"}
::

::api-example{method="GET" path="/johndoe/store/inventory/items"}
::

::api-example{method="GET" path="/johndoe/store/inventory/items/0"}
::

## Array Index vs ID Match

When a path segment reaches an array:

- **Numeric** — treated as array index (`0` = first element)
- **Non-numeric** — matched against element `id` or `_id`

::api-example{method="GET" path="/johndoe/products/abc-123"}
::

Finds element where `id` or `_id` equals `"abc-123"`. Returns `404` if not found.

Primitive arrays (strings, numbers) only support numeric index.

## ID Match in Mutations

POST, PATCH, DELETE use last path segment as ID when targeting array:

::api-example{method="PATCH" path="/johndoe/products/5" body='{"price":5.99}' auth="true"}
::

::api-example{method="DELETE" path="/johndoe/products/5" auth="true"}
::

Traverses to `products` array, finds element with `id`/`_id` = `5`, applies mutation.

### Nested ID

::api-example{method="PATCH" path="/johndoe/store/inventory/items/2" body='{"price":5.99}' auth="true"}
::

Traverses to `inventory.items` array, matches ID `2`, patches.

## Batch Mutations

PATCH and DELETE accept query params for batch operations on nested arrays:

::api-example{method="DELETE" path="/johndoe/store/inventory/items?inStock=false" auth="true"}
::

See [Query Parameters](/docs/query-params).
