---
title: Private API & API Keys
slug: private-api
order: 7
---

# Private API & API Keys

Mark files private to restrict access. Only requests with valid API keys get through.

## Making a File Private

Toggle the lock icon in the edit page for any file. Private files return `403` to unauthenticated requests:

```json
{ "error": "Forbidden. This file is private." }
```

## Generating an API Key

1. Go to Dashboard → **API Keys**
2. Click **Create Key**, give it a name
3. Copy the `js_` prefixed key — **shown once only**

Up to 10 keys per account. Keys are hashed on storage; plaintext cannot be retrieved after creation.

## Authenticating Requests

Two ways to send the key:

**Bearer header (recommended):**

```
GET /<username>/<filename>
Authorization: Bearer js_xxxxxxxxxxxx
```

**Query parameter:**

```
GET /<username>/<filename>?api_key=js_xxxxxxxxxxxx
```

### Examples

Using curl:

```bash
# Bearer header
curl -H "Authorization: Bearer js_xxxxxxxxxxxx" \
  https://json.shahriyar.dev/johndoe/analytics-data

# Query parameter
curl "https://json.shahriyar.dev/johndoe/analytics-data?api_key=js_xxxxxxxxxxxx"
```

### JavaScript (fetch)

```js
// Bearer header
const res = await fetch("https://json.shahriyar.dev/johndoe/analytics-data", {
  headers: { Authorization: "Bearer js_xxxxxxxxxxxx" },
})
const data = await res.json()
```

```js
// Query parameter
const res = await fetch(
  "https://json.shahriyar.dev/johndoe/analytics-data?api_key=js_xxxxxxxxxxxx"
)
const data = await res.json()
```

## Managing Keys

From Dashboard → **API Keys** you can:

- **View masked keys** — see the first 8 and last 4 characters to identify keys
- **See last used** — timestamp of most recent authentication
- **Revoke** — permanently invalidate a key. This cannot be undone.

## Error Responses

| Status | Meaning |
|--------|---------|
| `403` | File is private and request lacks a valid API key |
| `429` | Rate limit exceeded (60/min per file, 100k/month per account) |
