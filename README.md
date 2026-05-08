# JSON Server

Turn JSON files into REST APIs. Instantly.

Sign in with GitHub, upload a `.json` file, and get a public URL you can use right away. No backend to build, no servers to manage.

**Try it at [json.shahriyar.dev](https://json.shahriyar.dev)**

## How it works

1. Sign in with GitHub
2. Upload a JSON file
3. Hit the URL — `GET /yourname/filename`

That's it. Your data is live.

## What you can do

- **Query your data** — filter, sort, search, paginate. All through URL parameters.
- **Nested paths** — dive into objects and arrays: `/file/products/0/name`
- **Private files** — mark files private, generate API keys, control access
- **Version history** — every change is saved. View diffs, revert anytime.
- **Webhooks** — get notified when a file changes
- **Analytics** — see how many times your endpoints are hit, where requests come from
- **Auto-generated docs** — every file gets its own docs page

## Query examples

```
GET /yourname/products?search=phone
GET /yourname/products?sort=price&order=desc&_limit=5
GET /yourname/products?filter=categoryId:2
```

Combine them however you want.

## Run your own

You can host this yourself with Docker.

See [SELFHOST.md](SELFHOST.md) for setup instructions.
