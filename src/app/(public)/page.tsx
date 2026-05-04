import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@/components/sign-in-button"
import { Container } from "@/components/container"
import {
  ArrowRight,
  FileJson,
  Search,
  Route,
  Server,
  Globe,
  ExternalLink,
  LogIn,
  History,
  Webhook,
  Lock,
} from "lucide-react"

export const metadata: Metadata = {
  title: "JSON Server — Your JSON, live.",
}

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <>
      {/* Hero */}
      <section className="pb-20 pt-24 sm:pb-28 sm:pt-32">
        <Container>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Your JSON, instantly live.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Upload JSON files and get a public API endpoint instantly. Nested
            paths, filtering, webhooks, version history, analytics — no backend
            needed.
          </p>
          <div className="mt-10 flex items-center gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button size="lg">
                  Go to Dashboard <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
            ) : (
              <SignInButton />
            )}
            <Link href="/docs">
              <Button variant="outline" size="lg">
                Read the Docs <ExternalLink className="ml-1 size-4" />
              </Button>
            </Link>
          </div>
          {session && (
            <p className="mt-6 text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {session.user.username || session.user.name}
              </span>
            </p>
          )}
        </Container>
      </section>

      {/* How it works */}
      <section className="border-t py-20 sm:py-28">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to your own JSON API
          </p>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            <div>
              <div className="flex size-12 items-center justify-center border">
                <LogIn className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium">
                1. Sign in with GitHub
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No passwords, no forms. Just click and you&apos;re in.
              </p>
            </div>
            <div>
              <div className="flex size-12 items-center justify-center border">
                <FileJson className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium">
                2. Upload your JSON
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop any{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">.json</code>{" "}
                file. Paste raw JSON. Give it a name.
              </p>
            </div>
            <div>
              <div className="flex size-12 items-center justify-center border">
                <Globe className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium">3. Share the URL</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Anyone can fetch your data at{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  /username/filename
                </code>
                . Add paths, filters, or sort params.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Features — Bento grid */}
      <section className="border-t py-20 sm:py-28">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every uploaded file becomes a fully queryable API
          </p>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="border p-6 lg:col-span-2 flex flex-col justify-center">
              <Server className="size-7 text-foreground" />
              <h3 className="mt-5 text-lg font-medium">Public API</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Every file served at{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  GET /:username/:filename
                </code>{" "}
                with CORS headers. No auth needed for public files. Use from
                browsers, mobile apps, or server-side.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Webhook className="size-3.5" /> Webhooks
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <History className="size-3.5" /> Version History
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="size-3.5" /> CORS Enabled
                </span>
              </div>
            </div>
            <div className="border p-6">
              <Route className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">Nested Paths</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drill into objects and arrays via URL segments.{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  /file/products/0/name
                </code>{" "}
                returns the exact value.
              </p>
            </div>
            <div className="border p-6">
              <Search className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">Search &amp; Filter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Query params for filtering, sorting, and searching.{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?search=term
                </code>
                ,{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?filter=key:value
                </code>
                ,{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?sort=field&order=desc
                </code>
                .
              </p>
            </div>
            <div className="border p-6 lg:col-span-2">
              <Lock className="size-6 text-foreground" />
              <h3 className="mt-4 text-base font-medium">Private Files</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Mark files private and generate API keys. Authenticate via{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  Authorization: Bearer
                </code>{" "}
                header or{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?api_key=
                </code>
                . Keys are hashed, shown once.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t py-20 sm:py-28">
        <Container>
          <h2 className="mt-20 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to go?
          </h2>
          <p className="mt-3 text-muted-foreground">
            No tiers, no credit card required. Sign in with GitHub and upload
            your first JSON in under a minute.
          </p>
          <div className="mt-8">
            {session ? (
              <Link href="/dashboard">
                <Button size="lg">
                  Go to Dashboard <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
            ) : (
              <SignInButton />
            )}
          </div>
        </Container>
      </section>
    </>
  )
}
