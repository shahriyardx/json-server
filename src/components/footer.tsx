import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <span className="text-sm font-bold tracking-tight">
          JSON-SERVER
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
          <span className="text-xs text-muted-foreground">
            Open source &middot; Built with Next.js
          </span>
        </div>
      </div>
    </footer>
  )
}
