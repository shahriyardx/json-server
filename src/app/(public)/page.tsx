import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@/components/sign-in-button"
import { Container } from "@/components/container"
import { LogIn, FileJson, Share2 } from "lucide-react"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center pt-24 pb-16 sm:pt-32 sm:pb-20">
        <Container>
          <div className="mx-auto max-w-lg text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Your JSON, instantly live.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Upload JSON files, get public URLs. Share data anywhere.
          </p>
          {session ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {session.user.username || session.user.name}
                </span>
              </p>
              <div>
                <Link href="/dashboard">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <SignInButton />
            </div>
          )}
        </div>
      </Container>
      </section>

      {/* How it works */}
      <section className="pb-24 sm:pb-32">
        <Container>
          <div className="mx-auto max-w-2xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <LogIn className="mx-auto size-4 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Sign in</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                With GitHub
              </p>
            </div>
            <div className="text-center">
              <FileJson className="mx-auto size-4 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Upload</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Name your JSON
              </p>
            </div>
            <div className="text-center">
              <Share2 className="mx-auto size-4 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Share</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                /username/file
              </p>
            </div>
          </div>
        </div>
      </Container>
      </section>
    </>
  )
}
