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

::http{method="GET" path="/johndoe/products"}
::

```json
[
  { "id": 1, "name": "Widget", "price": 9.99 },
  { "id": 2, "name": "Gadget", "price": 14.99 }
]
```

## Private Files

If a file is marked **private**, the API returns `403` unless the request is authenticated:

```json
{ "error": "Forbidden" }
```

### API Key Authentication

Generate an API key from the Dashboard → **API Keys** page. Two ways to authenticate:

**Bearer header:**

```
Authorization: Bearer js_xxxxxxxxxxxx
```

**Query parameter:**

```
GET /<username>/<filename>?api_key=js_xxxxxxxxxxxx
```

Authenticated requests also skip monthly rate limits.

## Error Responses

| Status | Meaning |
|--------|---------|
| `403` | File is private and request lacks a valid API key |
| `404` | User, file, or nested path not found |
| `500` | Server error or invalid JSON content |

Errors return JSON:

```json
{ "error": "Not found" }
```
