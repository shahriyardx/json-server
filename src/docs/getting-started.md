---
title: Getting Started
slug: getting-started
order: 1
---

# Getting Started

JSON Server turns JSON files into RESTful APIs. Every file becomes a live endpoint at `/<username>/<filename>` with full CRUD, querying, and nested path traversal.

## Base URL

```
https://json.shahriyar.dev/<username>/<filename>
```

Replace `<username>` with the GitHub username of whoever owns the file, and `<filename>` with the file name.

## Quick Example

Given a file `products` with this content:

```json
[
  { "id": 1, "name": "Widget", "price": 9.99, "inStock": true },
  { "id": 2, "name": "Gadget", "price": 14.99, "inStock": false },
  { "id": 3, "name": "Pro", "price": 29.99, "inStock": true }
]
```

### GET — Fetch data

::api-example{method="GET" path="/johndoe/products"}
::

Returns full array.

### GET — Find by ID

::api-example{method="GET" path="/johndoe/products/1"}
::

Finds item where `id` or `_id` matches. Returns the item or `404`.

### POST — Add item

::api-example{method="POST" path="/johndoe/products" body='{"name":"New","price":19.99}' auth="true"}
::

Appends item to array. Returns `201` with created item. ID auto-generated if existing items have `id`/`_id`.

### POST — Replace item

::api-example{method="POST" path="/johndoe/products/1" body='{"name":"Replaced","price":0.99}' auth="true"}
::

Replaces entire element at matching ID. Path ID takes precedence over body ID.

### PATCH — Update item

::api-example{method="PATCH" path="/johndoe/products/1" body='{"price":5.99}' auth="true"}
::

Merges fields into matching item. Also supports batch update with query params.

### DELETE — Remove item

::api-example{method="DELETE" path="/johndoe/products/1" auth="true"}
::

Removes matching item. Returns deleted item. Also supports bulk delete with query params.

## Auth

Public files require no auth for reads. Mutations (POST, PATCH, DELETE) always require API key.

Pass via `Authorization: Bearer <key>` header or `?api_key=<key>` query param.

See [Authentication](/docs/private-api).

## Response Format

GET returns raw data. Mutations wrap response:

```json
{ "success": true, "data": { "id": 4, "name": "New", "price": 19.99 } }
```

Errors:

```json
{ "success": false, "error": "Item not found" }
```

## Rate Limits

- **Per-file**: 60 requests/min sliding window — `429` with `Retry-After`
- **Per-account**: 100,000 requests/month — resets 1st of each month

Admin accounts bypass limits.

## CORS

All endpoints return `Access-Control-Allow-Origin: *`. Works cross-origin.
