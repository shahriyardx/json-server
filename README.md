# JSON Server

Hosted at [json.shahriyar.dev](https://json.shahriyar.dev) — upload JSON files and access them via a public API. Every file becomes a live endpoint with nested path traversal, filtering, sorting, and search.

## How It Works

1. Sign in with GitHub
2. Upload a `.json` file via the dashboard
3. Access it at `/<username>/<filename>` — no auth required for reads

## Features

- **Public API** — every uploaded file served as JSON at `GET /<username>/<filename>`
- **Nested path traversal** — drill into objects and arrays via URL path segments (`/user/file/items/0/name`)
- **Query parameters** — `?search=term`, `?sort=field&order=asc|desc`, `?filter=key:value`
- **Dashboard** — manage files, copy URLs, upload via drag-and-drop
- **Documentation** — markdown docs rendered with Comark custom components

## Built With

- [Next.js](https://nextjs.org) 16.2 (Turbopack)
- [better-auth](https://better-auth.com) — GitHub OAuth
- [tRPC](https://trpc.io) — type-safe API routes
- [Prisma](https://prisma.io) + PostgreSQL — data storage
- [shadcn/ui](https://ui.shadcn.com) — component library
- [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) — form validation
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
