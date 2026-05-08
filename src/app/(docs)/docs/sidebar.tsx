"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { DocPage } from "@/lib/docs"

export function DocsSidebar({ docs }: { docs: DocPage[] }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="sticky top-24 space-y-1">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Documentation
        </p>
        {docs.map((doc) => {
          const href = `/docs/${doc.slug}`
          const isActive = pathname === href
          return (
            <Link
              key={doc.slug}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {doc.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
