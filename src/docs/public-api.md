---
title: API Reference
slug: public-api
order: 2
---

# API Reference

All endpoints live under `/<username>/<filename>`.

## GET

Fetch JSON content. Supports nested paths and query params.

::api-example{method="GET" path="/johndoe/products"}
::

Returns raw JSON. Supports conditional requests via `If-None-Match` (ETag) and `If-Modified-Since` — returns `304 Not Modified` when unchanged.

### Path Traversal

::api-example{method="GET" path="/johndoe/store/inventory/items"}
::

See [Nested Paths](/docs/nested-paths).

### Query Params

::api-example{method="GET" path="/johndoe/products?search=widget&sort=price&order=desc"}
::

See [Query Parameters](/docs/query-params).

## POST

Add item to array, or replace item by ID.

### Append

::api-example{method="POST" path="/johndoe/products" body='{"name":"New Item","price":9.99}' auth="true"}
::

Response `201`:

```json
{ "success": true, "data": { "id": 4, "name": "New Item", "price": 9.99 } }
```

**Auto-ID**: If existing elements have `id`/`_id`, auto-generates (numeric → max+1, string → UUID). Body `id`/`_id` used as-is. Duplicate returns `409`.

### Replace

::api-example{method="POST" path="/johndoe/products/1" body='{"name":"Replaced","price":0.99}' auth="true"}
::

Finds by `id`/`_id`. Replaces entire element. Path ID wins. `404` if not found.

## PATCH

Merge fields into object or filtered array items.

::api-example{method="PATCH" path="/johndoe/products/1" body='{"price":5.99}' auth="true"}
::

### Batch Update

::api-example{method="PATCH" path="/johndoe/products?inStock=false" body='{"inStock":true}' auth="true"}
::

Query params filter array items, body merges into each match.

```json
{ "success": true, "data": [...] }
```

## DELETE

Remove item by ID or bulk by filter.

### Single

::api-example{method="DELETE" path="/johndoe/products/1" auth="true"}
::

```json
{ "success": true, "data": { "id": 1, "name": "Widget", "price": 9.99 } }
```

### Bulk

::api-example{method="DELETE" path="/johndoe/products?inStock=false" auth="true"}
::

Returns array of removed items.

## Error Codes

| Code | When |
|------|------|
| 400 | Invalid body, target not array (POST), no ID/filter (DELETE) |
| 401 | Missing/invalid API key (mutations) |
| 403 | Private file, no valid key (GET) |
| 404 | User, file, path, or ID not found |
| 409 | Duplicate `id`/`_id` (POST) |
| 429 | Rate or monthly limit exceeded |
| 500 | Invalid JSON content in file |
