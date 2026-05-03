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
  InfinityIcon,
  Server,
  Zap,
  Globe,
  ExternalLink,
  LogIn,
} from "lucide-react"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-20 sm:pt-32 sm:pb-28">
        <Container>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Your JSON, instantly live.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Upload any JSON file and get a public API endpoint instantly. No
            setup, no backend, no limits.
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
                file. Give it a name.
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
                .
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="border-t py-20 sm:py-28">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every uploaded file becomes a fully queryable API
          </p>
          <div className="mt-16 grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-background p-6">
              <Server className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">Public API</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every file served at{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  GET /:username/:filename
                </code>{" "}
                with proper{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  Content-Type
                </code>
                .
              </p>
            </div>
            <div className="bg-background p-6">
              <Route className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">Nested Paths</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Traverse objects and arrays via URL paths.{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  /user/file/products/0/name
                </code>{" "}
                returns exactly the value you need.
              </p>
            </div>
            <div className="bg-background p-6">
              <Search className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">Search &amp; Filter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use query params like{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?search=term
                </code>
                ,{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?filter=key:value
                </code>
                , or{" "}
                <code className="bg-muted px-1 py-0.5 text-xs">
                  ?sort=field&order=desc
                </code>
                .
              </p>
            </div>
            <div className="bg-background p-6">
              <Zap className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">Blazing Fast</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Built on Next.js with Postgres. Your data is served directly
                from the database, no cold starts.
              </p>
            </div>
            <div className="bg-background p-6">
              <Globe className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">CORS Enabled</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Access your JSON from any origin. Use it in browsers, mobile
                apps, or server-side — no restrictions.
              </p>
            </div>
            <div className="bg-background p-6">
              <InfinityIcon className="size-5 text-foreground" />
              <h3 className="mt-4 text-sm font-medium">No Limits</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload as many files as you want. No rate limits on reads. Free
                for everyone.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing + CTA */}
      <section className="border-t py-20 sm:py-28">
        <Container>
          <h2 className="mt-20 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to go?
          </h2>
          <p className="mt-3 text-muted-foreground">
            No tiers, no hidden quotas, no credit card required. Sign in with
            GitHub and upload your first JSON in under a minute.
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
