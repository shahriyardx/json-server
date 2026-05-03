import Link from "next/link"
import { Container } from "@/components/container"

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
            We collect GitHub account information (username, avatar, email)
            when you sign in via OAuth. We store JSON files you upload along
            with filenames you provide.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">
            How we use it
          </h2>
          <p>
            GitHub profile data is used for authentication and to display
            your username on your public JSON endpoints. Uploaded JSON files
            are served publicly at the URL you choose.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">
            Data storage
          </h2>
          <p>
            Data is stored in a Postgres database. You can delete your
            account and all associated data at any time from the dashboard.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">
            Third-party services
          </h2>
          <p>
            We use GitHub for authentication. Your GitHub profile data is
            shared with us through GitHub OAuth. No other third parties
            have access to your data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">Contact</h2>
          <p>
            For privacy-related inquiries, open an issue on our GitHub
            repository.
          </p>
        </section>

        <p className="pt-4 text-xs">Last updated: May 2026</p>
      </div>
      </div>
    </Container>
  )
}
