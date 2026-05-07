import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@/components/sign-in-button"
import { Container } from "@/components/container"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <header className="flex items-center py-4 sm:py-6">
      <Container className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight">
          JSON-SERVER
        </Link>
        <nav className="hidden items-center gap-4 sm:flex">
          <Link
            href="/about"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href="/contact"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Contact
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
          <ThemeToggle />
        </nav>
        <MobileNav signedIn={!!session} />
      </Container>
    </header>
  )
}
