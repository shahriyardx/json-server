---
title: Getting Started
slug: getting-started
order: 1
---

# Getting Started

JSON Server lets you upload JSON files and access them via a public API at `/<username>/<filename>`. Every uploaded file becomes a live endpoint with filtering, sorting, searching, and nested path traversal.

## Quick Start

1. Sign in with GitHub
2. Go to Dashboard → Upload
3. Drop a `.json` file, set a filename, click upload
4. Access your JSON at `https://json-server.shahriyar.dev/<username>/<filename>`
5. Share the URL — anyone can fetch it

## Authentication

GitHub OAuth is the only sign-in method. Uploading and managing files requires authentication. The public API does **not** require authentication — anyone with the URL can fetch your JSON.

## Example

Upload a file called `products.json` with this content:

```json
[
  { "id": 1, "name": "Widget", "price": 9.99 },
  { "id": 2, "name": "Gadget", "price": 14.99 }
]
```

Access it at `GET /yourname/products`. Returns the full array as JSON.
