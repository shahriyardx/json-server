# JSON Server

Self-hosted platform to turn JSON files into REST APIs. Upload JSON, get endpoints with full query support. GitHub OAuth login. Dashboard for managing files, API keys, versions, analytics.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma 7
- **Auth:** Better Auth (GitHub OAuth)
- **API:** tRPC for internal, raw REST for public JSON endpoints
- **UI:** shadcn/ui (Radix + Tailwind CSS)
- **Styling:** Tailwind CSS, class-variance-authority, lucide-react icons
- **JSON Viewer:** @microlink/react-json-view (base-16 themes)
- **Charts:** Recharts (via chart-wrapper)
- **Docs:** @comark/react (MDX)
- **Validation:** zod
- **Linting:** Biome

## Commands

```bash
bun dev              # Start dev server
bun run build        # Production build
bun run lint         # Biome check
bun run format       # Biome format
bunx prisma migrate dev --name <name>  # Create DB migration
bunx prisma generate  # Regenerate Prisma client
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Toaster, TRPCProvider, theme)
│   ├── globals.css             # Tailwind + theme variables
│   ├── [username]/[...slug]/   # PUBLIC REST API endpoint
│   ├── api/auth/               # Better Auth routes
│   ├── api/trpc/               # tRPC handler
│   ├── (dashboard)/dashboard/  # Auth-protected dashboard
│   │   ├── page.tsx            # Overview (stats, recent files, chart)
│   │   ├── json/               # File list + sub-routes
│   │   │   ├── page.tsx        # "JSON Files" list view
│   │   │   ├── upload/page.tsx # Upload new JSON
│   │   │   └── [fileId]/       # Per-file pages
│   │   │       ├── page.tsx    # JSON browser (react-json-view)
│   │   │       ├── edit/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── versions/page.tsx
│   │   │       └── docs/page.tsx
│   │   ├── settings/page.tsx   # User settings
│   │   ├── api-keys/page.tsx
│   │   ├── trash/page.tsx
│   │   ├── profile/            # Redirects to /dashboard/settings
│   │   └── [...slug]/          # Catch-all → redirect /dashboard
│   ├── (admin)/admin/          # Admin panel
│   └── (public)/               # Public pages (/, /about, /docs, etc.)
├── components/
│   ├── ui/                     # shadcn UI components
│   ├── json-file-row.tsx       # List-view row (expand, actions, snippets)
│   ├── json-diff-viewer.tsx    # Version diff
│   ├── api-snippets.tsx        # Code snippets for API access
│   ├── nav-main.tsx            # Sidebar nav
│   └── nav-user.tsx            # User dropdown
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts / auth-client.ts # Better Auth setup
│   ├── rate-limit.ts           # In-memory LRU rate limiter
│   ├── api-key.ts              # Key generation + SHA-256 hashing
│   ├── webhook.ts              # Webhook delivery
│   ├── docs.ts                 # MDX docs helpers
│   ├── env.ts                  # t3-env validation
│   └── trpc/
│       ├── trpc.ts             # tRPC init
│       ├── context.ts          # Auth context (session → user)
│       ├── client.ts           # Client-side tRPC
│       ├── router.ts           # Root router
│       └── routers/            # upload, admin, profile, api-keys, versions, webhooks, analytics
└── generated/prisma/           # Generated Prisma client
```

## Database Models

- **User** — id, name, username, email, image, role, createdAt
- **JsonFile** — id, userId, filename, content, isPublic, deletedAt (soft delete)
- **JsonFileVersion** — id, jsonFileId, content, createdAt
- **ApiKey** — id, userId, name, keyHash, lastUsedAt
- **UserMonthlyRequest** — userId, month, year, count (100k limit)
- **FileRequestLog** — fileId, date, count, referrers (JSON)
- **Webhook** — jsonFileId (unique), url, secret, enabled, lastDelivery*

## Public REST API

Pattern: `GET /:username/:filename` with optional deep path segments.

### Query Parameters

| Param | Example | Description |
|-------|---------|-------------|
| `search` | `?search=phone` | Search across string values |
| `filter` | `?filter=categoryId:1` | Filter by key:value |
| `sort` / `order` | `?sort=price&order=desc` | Sort by field |
| `_limit` | `?_limit=5` | Limit results |
| `_start` / `_end` | `?_start=2&_end=5` | Slice range |
| `_skip` | `?_skip=10` | Skip N results |
| `key=value` | `?categoryId=2` | Direct field filter |

### Auth

Pass API key via `Authorization: Bearer <key>` header or `?api_key=<key>` query param. Required for private files.

## Key Conventions

### Caveman mode ACTIVE
No articles, filler, or pleasantries. Fragments OK. Code/commits normal.

### No auto commit/push
Never commit or push unless explicitly asked. Stage changes, wait for instruction.

### Undercover mode (global)
No AI attribution, Co-Authored-By trailers, or assistant references in commits, PRs, or code.

### Path quoting
Directory names with parentheses `(dashboard)` require shell quoting: `"src/app/(dashboard)/dashboard/"`

### No DB field additions without approval
Do not add new Prisma model fields unless user explicitly asks.

### shadcn conventions
- Use `bun shadcn add <component>` to add UI components
- Components in `src/components/ui/`
- CSS variables in `globals.css`
