import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@/components/sign-in-button"
import { Container } from "@/components/container"

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <header className="flex items-center justify-between py-4 sm:py-6">
      <Container className="flex items-center justify-between">
      <Link href="/" className="text-sm font-bold tracking-tight">
        JSON-SERVER
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/docs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Docs
        </Link>
        {session ? (
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        ) : (
          <SignInButton />
        )}
      </nav>
      </Container>
    </header>
  )
}
