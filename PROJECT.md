# JSON Server — Complete Project Reference

## Overview

Hosted JSON hosting service. Users upload `.json` files, get a public API endpoint at `/<username>/<filename>` with nested path traversal, query filtering, sorting, search, webhooks, version history, and per-file analytics.

Domain: json.shahriyar.dev  
Stack: Next.js 16.2 (Turbopack) + Prisma (PostgreSQL) + tRPC v11 + better-auth + shadcn/ui + Tailwind v4

---

## Tech Stack (exact versions)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2.4 (Turbopack) | App Router, React 19.2.4 |
| Auth | better-auth | GitHub OAuth, session cookies |
| API | tRPC v11 | Server/client type-safe RPC |
| ORM | Prisma (postgresql) | Schema in `prisma/schema.prisma`, client in `src/generated/prisma` |
| Forms | react-hook-form + zod | With `@hookform/resolvers` |
| Charts | recharts 3.8.0 | Via shadcn `ChartContainer` wrapper |
| Markdown | Comark | Custom `http` component for API examples |
| Icons | lucide-react | |
| Archiving | JSZip | Export all files as ZIP |

---

## File Structure

```
prisma/schema.prisma          # Database schema
src/
  app/
    (dashboard)/dashboard/     # Authenticated dashboard routes (8 pages)
    (public)/docs/             # Public documentation pages (6 markdown files)
    [username]/[...slug]/      # Public API endpoint (GET handler)
    api/auth/[...all]/         # better-auth API routes
    api/trpc/[trpc]/           # tRPC HTTP handler
  components/
    ui/                        # shadcn components (button, dialog, chart, etc.)
    app-sidebar.tsx            # Dashboard sidebar
    json-tree-view.tsx         # Expandable JSON tree component
    json-data-table.tsx        # Sortable/paginated table for JSON arrays
    json-diff-viewer.tsx       # Side-by-side version diff
  lib/
    trpc/
      router.ts                # tRPC app router (all sub-routers registered here)
      trpc.ts                  # tRPC init, context, protectedProcedure
      client.ts                # tRPC client setup
      routers/
        upload.ts              # File CRUD, search, trash, restore, permanent delete
        admin.ts               # Admin user/file management
        profile.ts             # User profile
        api-keys.ts            # API key management
        versions.ts            # Version history & diff
        webhooks.ts            # Webhook CRUD, toggle, regenerate secret
        analytics.ts           # Per-file request analytics
    auth.ts                    # better-auth server instance
    auth-client.ts             # better-auth browser client
    prisma.ts                  # Prisma singleton
    webhook.ts                 # HMAC-SHA256 signing, webhook delivery
    rate-limit.ts              # Sliding window rate limiter
    api-key.ts                 # API key generation and hashing
    docs.ts                    # Markdown doc loader (gray-matter)
    utils.ts                   # cn() helper (clsx + tailwind-merge)
  docs/                        # 6 markdown doc files with YAML frontmatter
```

---

## Database Models (Prisma)

| Model | Table | Key Relations | Notes |
|-------|-------|--------------|-------|
| User | `user` | → JsonFile, ApiKey, UserMonthlyRequest | GitHub OAuth, unique email |
| Session | `session` | → User | better-auth sessions |
| Account | `account` | → User | better-auth OAuth accounts |
| JsonFile | `json_file` | → User, → JsonFileVersion, → Webhook, → FileRequestLog | Soft delete via `deletedAt` |
| ApiKey | `api_key` | → User | `keyHash` stored, unique per hash |
| JsonFileVersion | `json_file_version` | → JsonFile | Max 50 per file (auto-trim) |
| UserMonthlyRequest | `user_monthly_request` | → User | Unique per `userId + month + year` |
| Webhook | `webhook` | → JsonFile | One per file (unique), HMAC-SHA256 secret |
| FileRequestLog | `file_request_log` | → JsonFile | Unique per `fileId + date`, referrer JSON |

---

## Routes

### Public API
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/[username]/[...slug]` | Fetch JSON with nested path traversal |
| OPTIONS | `/[username]/[...slug]` | CORS preflight |

### tRPC Procedures
All under `/api/trpc/[trpc]`. Routers:

**upload**: `getMyJsons`, `searchJsons`, `getJson`, `createJson`, `updateJson`, `deleteJson`, `restoreFile`, `permanentDeleteFile`, `trashFiles`, `toggleFileVisibility`  
**admin**: `getUsers`, `getAllJsons`, `deleteUser`, `deleteJson`  
**profile**: `updateProfile`  
**apiKeys**: `list`, `create`, `revoke`  
**versions**: `list`, `get`, `revert`  
**webhooks**: `getWebhook`, `upsertWebhook`, `toggleWebhook`, `regenerateSecret`, `deleteWebhook`  
**analytics**: `getFileAnalytics`

### Dashboard Pages (authenticated)
| Route | Component Type | Description |
|-------|---------------|-------------|
| `/dashboard` | Server + Client chart | Overview with 4 stat cards, 7-day request chart, recent files, quick actions |
| `/dashboard/my-jsons` | Client | List/grid view, search, sort, filter, file actions |
| `/dashboard/upload` | Client | File drag-drop and paste modes |
| `/dashboard/edit/[fileId]` | Client | Editor with webhook config, public/private toggle |
| `/dashboard/explore/[fileId]` | Client | Table/tree JSON browser |
| `/dashboard/versions/[fileId]` | Client | Version history, diffs, revert |
| `/dashboard/analytics/[fileId]` | Client | 30-day request chart, referrer breakdown |
| `/dashboard/api-keys` | Client | Create/revoke API keys |
| `/dashboard/trash` | Client | Restore or permanently delete files |
| `/dashboard/docs/[username]/[filename]` | Server + Client | Auto-generated API docs for a file |
| `/dashboard/profile` | Client | User profile |

### Public Docs
| Route | Description |
|-------|-------------|
| `/docs` | Redirects to first doc page |
| `/docs/[slug]` | Renders markdown from `src/docs/` |

---

## Key Implementation Details

### Public API (route.ts)
- CORS: `Access-Control-Allow-Origin: *` on all responses
- Rate limiting: 60 req/min sliding window per `username/filename` key
- Monthly quota: 100k req/month per user via `UserMonthlyRequest` upsert
- Auth: API key lookup by hash, supports `Authorization: Bearer` and `?api_key=`
- Fire-and-forget: analytics logging + webhook delivery don't block response
- Filtering: `?search=term`, `?sort=field&order=asc|desc`, `?filter=key:value`, direct `?key=value`
- Traversal: path segments drill into nested objects/arrays
- Sorting uses `array.toSorted()` (ES2023)

### Authentication
- better-auth with GitHub OAuth provider
- Session tokens stored in cookies, managed by better-auth
- tRPC `protectedProcedure` checks session and attaches `ctx.user`
- Admin role check: `ctx.user.role === "admin"` for admin routes

### Webhooks
- Configured per-file in edit page
- HMAC-SHA256 signed payloads with `X-Webhook-Signature` header
- `X-Webhook-Event: file.updated` event type header
- 10-second timeout on delivery
- Delivery status tracked: timestamp, response code, success/failure
- Secret shown once on creation, masked (`abc123...wxyz`) afterward
- Can regenerate secret, toggle enabled/disabled, or delete

### Analytics
- `FileRequestLog` upserted daily per file with request count
- Referrer domain extracted from `Referer` header, stored as JSON object
- tRPC procedure returns 30-day daily array, totals, avg, top referrer
- Charts use recharts BarChart in shadcn ChartContainer
- Chart config uses `color: "var(--chart-1")` (Light: `oklch(0.87 0 0)`)

### Trash / Soft Delete
- `JsonFile.deletedAt` set on delete. File hidden from My JSONs, visible in Trash
- Restore: `deletedAt = null`. Fails if filename conflict
- Permanent delete: removes file + all versions from DB
- Confirmation dialog before all destructive actions

### Version History
- Snapshot saved on every file update
- Auto-trims to 50 newest versions per file
- Side-by-side diff viewer
- Revert saves current content as version first, then restores old content

### Edit Page
- `react-hook-form` with `zodResolver` for validation
- Filename regex: `/^[a-zA-Z0-9_-]+$/`
- JSON validation: tries `JSON.parse()`, shows error if invalid
- Shape indicator: "Array(15) of object", "Object with 3 keys", etc.
- Update fires webhook delivery (fire-and-forget)

### Dashboard Overview
- Async server component with 9 parallel Prisma queries
- Chart rendered via client wrapper (`chart-wrapper.tsx`) because Next.js 16 forbids `ssr: false` in server components
- 7-day bar chart of daily requests across all files
- Type breakdown: arrays vs objects vs primitives (parsed in server component)
- Recent files list with relative timestamps

### React 19 Patterns Used
- `use(X)` replaces `useContext(X)` for context reads
- `params: Promise<{...}>` — route params are Promises
- `array.toSorted()` for immutable sorting
- `useCallback` for memoized handlers
- CSS variables for theming (Tailwind v4 + shadcn)

---

## Key Conventions

1. **Fire-and-forget**: Analytics logging and webhook delivery `.catch(() => {})` in API handler
2. **Server components**: Dashboard overview does all Prisma queries in server, passes data to client chart
3. **Client wrappers**: Dynamic imports with `ssr: false` go in wrapper client components (see `chart-wrapper.tsx`)
4. **Prisma compound unique**: `@@unique([fieldA, fieldB])` pattern used in multiple models
5. **Password hashing for API keys**: Keys stored as HMAC-SHA256 hash, plaintext shown once
6. **Recharts via shadcn**: Always use `ChartContainer` with `ChartConfig`, never raw recharts
7. **Chart colors**: Use CSS variables `--chart-1` through `--chart-N` or `var(--color-<key>)` pattern
8. **Color format**: Tailwind v4 uses `oklch()` throughout

---

## Environment Variables

```
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

---

## Setup

```bash
bun install
bunx prisma generate
bun dev
```
