# JSON Server

Hosted at [json.shahriyar.dev](https://json.shahriyar.dev) — upload JSON files, get instant REST APIs. Every file becomes a live endpoint with nested path traversal, filtering, sorting, search, pagination, and more.

## How It Works

1. Sign in with GitHub
2. Upload a `.json` file via the dashboard
3. Access it at `GET /<username>/<filename>`

## Features

### Public REST API
- Nested path traversal — `/<username>/<filename>/items/0/name`
- Search — `?search=term`
- Filter — `?filter=key:value` or `?key=value`
- Sort — `?sort=field&order=asc|desc`
- Limit — `?_limit=5`
- Slice — `?_start=2&_end=5`
- Skip — `?_skip=10`
- Rate limiting — 60 requests/min per file, 100k requests/month per user
- Private files with API key auth — `Authorization: Bearer <key>` or `?api_key=<key>`
- ETag + Last-Modified caching

### Dashboard
- Upload JSON via drag-and-drop or paste
- Tree-based JSON viewer with syntax highlighting (dark/light theme)
- Inline editor for quick fixes
- Expand/collapse rows with JS code snippets for API access
- API key management
- Version history with diffs and revert
- Per-file analytics (daily request counts, referrer tracking, 30-day charts)
- Generated docs page per file
- Webhooks with HMAC-SHA256 signatures
- Soft-delete trash with restore
- User settings (edit display name)

### Query Parameters

| Param | Example | Description |
|-------|---------|-------------|
| `search` | `?search=phone` | Full-text search across string values |
| `filter` | `?filter=categoryId:1` | Filter by key:value pair |
| `sort` / `order` | `?sort=price&order=desc` | Sort by field, ascending or descending |
| `_limit` | `?_limit=5` | Limit number of results |
| `_start` / `_end` | `?_start=2&_end=5` | Slice result range |
| `_skip` | `?_skip=10` | Skip first N results |
| `key=value` | `?categoryId=2` | Direct filter by any field |

Combine params: `?sort=price&order=desc&_limit=3&search=phone`

## Tech Stack

- [Next.js](https://nextjs.org) 16.2 (App Router)
- [better-auth](https://better-auth.com) — GitHub OAuth authentication
- [tRPC](https://trpc.io) — type-safe internal API
- [Prisma](https://prisma.io) + PostgreSQL — data storage
- [shadcn/ui](https://ui.shadcn.com) — component library
- [@microlink/react-json-view](https://github.com/microlinkhq/react-json-view) — JSON tree viewer
- [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) — form validation
- [recharts](https://recharts.org) — analytics charts
- [Comark](https://comark.dev) — markdown docs rendering

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL database

### Setup

```bash
# Clone and install
git clone https://github.com/shahriyardx/json-server.git
cd json-server
bun install

# Environment
cp .env.example .env
```

Configure `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/jsonserver
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
BETTER_AUTH_SECRET=openssl rand -hex 32
BETTER_AUTH_URL=http://localhost:3000
```

```bash
# Database
bunx prisma migrate dev
bunx prisma generate

# Start
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### GitHub OAuth

Create an OAuth app at GitHub Settings → Developer settings → OAuth Apps:
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

## Self-Hosting

See [SELFHOST.md](SELFHOST.md) for Docker setup, environment variables, and GitHub OAuth configuration.

## Project Structure

```
src/
├── app/
│   ├── [username]/[...slug]/route.ts   # Public REST API
│   ├── api/auth/                        # Better Auth routes
│   ├── api/trpc/                        # tRPC handler
│   ├── (dashboard)/dashboard/           # Auth-protected dashboard
│   │   ├── json/                        # File management
│   │   │   ├── [fileId]/               # Explore, edit, analytics, versions, docs
│   │   │   └── upload/
│   │   ├── settings/                    # User settings
│   │   ├── api-keys/                    # API key management
│   │   └── trash/                       # Soft-deleted files
│   ├── (admin)/admin/                   # Admin panel
│   └── (public)/                        # Public landing pages
├── components/
│   ├── ui/                              # shadcn components
│   ├── json-file-row.tsx               # File list row
│   ├── json-diff-viewer.tsx            # Version diff
│   └── api-snippets.tsx                # API code snippets
└── lib/
    ├── trpc/routers/                    # tRPC routers
    ├── auth.ts                          # Better Auth config
    ├── rate-limit.ts                    # LRU rate limiter
    └── prisma.ts                        # Prisma client
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run `bun run lint` before committing
4. Keep commits small and focused
5. Open a PR against `main`

All PRs should pass the pre-commit hook and build. No AI attribution in commits or code.
