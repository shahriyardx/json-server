import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@/components/sign-in-button"
import { Container } from "@/components/container"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function DocsRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center py-4 sm:py-6">
        <Container className="flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-tight">
            JSON-SERVER
          </Link>
          <nav className="flex items-center gap-4">
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
        </Container>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <Container className="flex items-center justify-between py-8">
          <span className="text-xs text-muted-foreground">
            JSON Server &mdash;{" "}
            <a
              href="https://github.com/shahriyardx/json-server"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </span>
          <Link
            href="/docs"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Docs
          </Link>
        </Container>
      </footer>
    </div>
  )
}
