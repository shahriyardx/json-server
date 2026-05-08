# Self-Hosting JSON Server

Run your own instance with Docker. Self-hosted mode removes the marketing landing page and sends users straight to a GitHub login page.

## Quick Start (docker compose)

```bash
git clone https://github.com/shahriyardx/json-server.git
cd json-server

# Configure your GitHub OAuth app and secret
export GITHUB_CLIENT_ID=your_github_oauth_client_id
export GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
export BETTER_AUTH_SECRET=$(openssl rand -hex 32)

# Start PostgreSQL + app
docker compose -f selfhost/docker-compose.yml up -d
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Hub

```bash
docker pull shahriyardx/json-server
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/jsonserver \
  -e GITHUB_CLIENT_ID=your_github_oauth_client_id \
  -e GITHUB_CLIENT_SECRET=your_github_oauth_client_secret \
  -e BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  shahriyardx/json-server
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `BETTER_AUTH_SECRET` | Random secret for session encryption. Generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Public URL of your instance (e.g. `http://localhost:3000`) |

> Self-hosted mode (`SELF_HOSTED=true`) is baked into the image at build time. You don't need to set it — the landing page is automatically replaced with a direct login page.

## GitHub OAuth Setup

Create an OAuth app at GitHub Settings → Developer settings → OAuth Apps:

- **Homepage URL**: your instance URL (e.g. `http://localhost:3000`)
- **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`

Set the client ID and secret as env vars when starting the container.

## Running Locally (without Docker)

For development, use `docker compose -f docker-compose-db.yml up -d` from the project root to start only the database, then run `bun dev` as usual.
