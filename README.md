# JSON Server

Hosted at [json.shahriyar.dev](https://json.shahriyar.dev) — upload JSON files and access them via a public API. Every file becomes a live endpoint with nested path traversal, filtering, sorting, search, per-file analytics, webhooks, and version history.

## How It Works

1. Sign in with GitHub
2. Upload a `.json` file via the dashboard
3. Access it at `/<username>/<filename>` — no auth required for reads

## Features

- **Public API** — every uploaded file served as JSON at `GET /<username>/<filename>`
- **Nested path traversal** — drill into objects and arrays via URL path segments (`/user/file/items/0/name`)
- **Query parameters** — `?search=term`, `?sort=field&order=asc|desc`, `?filter=key:value`
- **Rate limiting** — 60 requests/min per file, 100k requests/month per user
- **Private files** — mark files private, access with API keys via `Authorization: Bearer` or `?api_key=`
- **Webhooks** — receive POST notifications on file updates with HMAC-SHA256 signatures
- **Version history** — every edit saves a snapshot with diffs and revert support
- **Per-file analytics** — daily request counts, referrer tracking, 30-day charts
- **Dashboard** — manage files, upload via drag-and-drop or paste, explore data in table/tree views
- **Trash** — soft delete with restore and permanent deletion
- **Documentation** — markdown docs rendered with Comark custom components

## Built With

- [Next.js](https://nextjs.org) 16.2 (Turbopack)
- [better-auth](https://better-auth.com) — GitHub OAuth
- [tRPC](https://trpc.io) — type-safe API routes
- [Prisma](https://prisma.io) + PostgreSQL — data storage
- [shadcn/ui](https://ui.shadcn.com) — component library
- [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) — form validation
- [recharts](https://recharts.org) — analytics charts
- [Comark](https://comark.dev) — markdown rendering with custom components

## Getting Started

```bash
bun install
bunx prisma generate
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```
