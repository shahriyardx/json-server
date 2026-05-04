import Link from "next/link"
import { Container } from "@/components/container"

export function Footer() {
  return (
    <footer className="border-t">
      <Container className="flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-sm font-bold tracking-tight">JSON-SERVER</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://shahriyar.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              shahriyar.dev
            </a>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Contact
          </Link>
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
        </div>
      </Container>
    </footer>
  )
}
