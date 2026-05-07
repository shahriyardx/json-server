---
title: Authentication
slug: private-api
order: 5
---

# Authentication

Public files readable without auth. Mutations (POST, PATCH, DELETE) always require a valid API key.

## API Keys

Generate keys from dashboard. Prefixed with `js_`. Up to 10 keys per account.

**Shown once** at creation. Revoked keys cannot be recovered.

## Authenticating

### Bearer Header

::api-example{method="GET" path="/johndoe/analytics-data" auth="true"}
::

::api-example{method="POST" path="/johndoe/products" body='{"name":"New","price":9.99}' auth="true"}
::

### Query Parameter

```
GET /<username>/<filename>?api_key=js_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Private Files

Mark file private to block anonymous reads. Unauthenticated requests return:

- `401` — mutation without key
- `403` — reading private file without key

```json
{ "success": false, "error": "Unauthorized" }
```

## Keys

Manage keys from dashboard: view masked keys (first 8 + last 4 chars), see last used timestamp, revoke.
