"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignInButton } from "@/components/sign-in-button"
import { Menu } from "lucide-react"

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="sm:hidden">
        <Button variant="ghost" size="icon-sm">
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <nav className="mt-8 flex flex-col gap-4 px-6">
          <Link
            href="/about"
            className="text-sm font-medium hover:text-foreground/80"
            onClick={() => setOpen(false)}
          >
            About
          </Link>
          <Link
            href="/docs"
            className="text-sm font-medium hover:text-foreground/80"
            onClick={() => setOpen(false)}
          >
            Docs
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium hover:text-foreground/80"
            onClick={() => setOpen(false)}
          >
            Contact
          </Link>
          {signedIn ? (
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Dashboard
              </Button>
            </Link>
          ) : (
            <div onClick={() => setOpen(false)}>
              <SignInButton />
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
