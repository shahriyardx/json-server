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
3. Drop a `.json` file (or paste JSON content), set a filename, click upload
4. Access your JSON at `https://json.shahriyar.dev/<username>/<filename>`
5. Share the URL — anyone can fetch it

## Authentication

GitHub OAuth is the only sign-in method. Uploading and managing files requires authentication.

By default the public API does **not** require authentication — anyone with the URL can fetch your JSON. You can make files **private** so the API returns `403` unless the request includes a valid **API key**.

API keys are managed from the Dashboard → API Keys page. Use them via `Authorization: Bearer <key>` header or `?api_key=<key>` query parameter.

## Features

- **Data Browser** — explore JSON in the browser with sortable tables for arrays of objects or expandable tree views for nested structures
- **Version History** — every edit saves a snapshot. Browse old versions, view diffs, and revert to any point
- **Search** — filter your files by name or content from the dashboard
- **Size Chart** — track file size changes over time on the edit page
- **Export** — download individual files or all files as a ZIP archive

## Example

Upload a file called `products.json` with this content:

```json
[
  { "id": 1, "name": "Widget", "price": 9.99 },
  { "id": 2, "name": "Gadget", "price": 14.99 }
]
```

Access it at `GET /yourname/products`. Returns the full array as JSON.
