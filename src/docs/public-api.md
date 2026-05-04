---
title: Public API
slug: public-api
order: 3
---

# Public API

Every uploaded JSON file is served as a public API endpoint with CORS headers allowing cross-origin requests.

## Base URL

```
GET /<username>/<filename>
```

Returns the full JSON content with `Content-Type: application/json` and `Access-Control-Allow-Origin: *`.

### Example

::http{method="GET" path="/johndoe/products"}
::

```json
[
  { "id": 1, "name": "Widget", "price": 9.99 },
  { "id": 2, "name": "Gadget", "price": 14.99 }
]
```

## Rate Limits

- **Per-file rate limit**: 60 requests per minute (sliding window). Exceeding returns `429` with a `Retry-After: 60` header.
- **Monthly limit**: 100,000 requests per account across all files. Exceeding returns `429` with the message `"Monthly request limit exceeded"`. Resets on the 1st of each month.

Rate limits apply to authenticated and unauthenticated requests alike. API keys do not increase the limit.

## Error Responses

| Status | Meaning |
|--------|---------|
| `404` | User, file, or nested path not found |
| `429` | Rate limit exceeded (per-minute or monthly) |
| `500` | Server error or invalid JSON content |

Errors return JSON:

```json
{ "error": "Not found" }
```
