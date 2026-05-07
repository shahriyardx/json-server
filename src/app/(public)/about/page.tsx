import type { Metadata } from "next"
import { Container } from "@/components/container"

export const metadata: Metadata = {
  title: "About",
}

export default async function AboutPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">About</h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-medium text-foreground">
              What is JSON Server?
            </h2>
            <p>
              A hosted service that turns JSON files into live API endpoints.
              Upload any JSON file and get a public URL with nested path
              traversal, query filtering, webhooks, version history, and
              per-file analytics. No backend to build, no infrastructure to
              manage.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">Why it exists</h2>
            <p>
              Mock APIs, frontend prototypes, and data-driven projects often
              need a quick backend. JSON Server eliminates the setup: sign in
              with GitHub, upload a file, and your data is live as a fully
              queryable REST endpoint. Useful for rapid prototyping, static site
              data, and sharing structured data with a URL.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">Technology</h2>
            <p>
              Built with Next.js 16 and Turbopack, tRPC for type-safe APIs,
              Prisma with PostgreSQL for storage, and better-auth for GitHub
              OAuth. Frontend uses shadcn/ui components with Tailwind CSS v4.
              Charts powered by recharts. Hosted at json.shahriyar.dev.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">Open source</h2>
            <p>
              The source code is available on GitHub. Contributions, bug
              reports, and feature requests are welcome.
            </p>
          </section>
        </div>
      </div>
    </Container>
  )
}
