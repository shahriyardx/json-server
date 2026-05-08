import { redirect } from "next/navigation"
import { env } from "@/lib/env"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (env.SELF_HOSTED === "true") {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
