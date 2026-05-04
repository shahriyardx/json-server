import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/container"

export const metadata: Metadata = {
  title: "Privacy Policy",
}

export default async function PrivacyPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Privacy Policy
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-medium text-foreground">
              What we collect
            </h2>
            <p>
              GitHub account information (username, avatar, email) when you sign
              in via OAuth. JSON files you upload along with filenames you
              provide. API request logs including timestamp, endpoint, referrer,
              and response status for rate limiting and analytics.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">
              How we use it
            </h2>
            <p>
              GitHub profile data for authentication and displaying your
              username on public JSON endpoints. Uploaded JSON files are served
              publicly at the URL you choose unless marked private. Request logs
              are aggregated into per-file analytics shown to file owners and
              are not shared publicly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">
              Data retention
            </h2>
            <p>
              Data stored in Postgres. Delete your account from the dashboard to
              remove all associated data. Deleted files move to trash and are
              permanently removed on manual action. Per-file request logs are
              retained for 90 days. Monthly usage counters reset each calendar
              month.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">
              Third-party services
            </h2>
            <p>
              GitHub for OAuth authentication. Your GitHub profile data shared
              with us through GitHub OAuth. No other third parties have access
              to your data. We do not use analytics services, tracking pixels,
              or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">Contact</h2>
            <p>
              For privacy-related inquiries,{" "}
              <Link
                href="/contact"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                contact us here
              </Link>{" "}
              or open an issue on our GitHub repository.
            </p>
          </section>

          <p className="pt-4 text-xs">Last updated: May 2026</p>
        </div>
      </div>
    </Container>
  )
}
