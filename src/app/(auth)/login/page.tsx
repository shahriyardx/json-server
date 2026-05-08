import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { GitHubSignIn } from "@/components/github-sign-in"

export const metadata: Metadata = {
  title: "Sign In",
}

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Branding */}
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 lg:flex">
        <div className="text-sm font-bold tracking-tight text-white/80">
          JSON SERVER
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Your JSON, live.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            Upload a JSON file and get a public REST API endpoint in seconds.
            No backend, no config.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-3 text-xs text-white/40">
            <span>Nested paths</span>
            <span>Search &amp; filter</span>
            <span>Version history</span>
            <span>Webhooks</span>
            <span>Analytics</span>
          </div>
        </div>
        <div className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} JSON Server
        </div>
      </div>

      {/* Right — Login */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile branding */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight">JSON Server</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload JSON, get a REST API.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight">
              Sign in
            </h2>
            <p className="text-sm text-muted-foreground">
              Use your GitHub account to continue.
            </p>
          </div>

          <div className="space-y-4">
            <GitHubSignIn />

            <p className="text-center text-xs text-muted-foreground">
              Self-hosted instance.{" "}
              <a
                href="https://github.com/shahriyardx/json-server"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Need help setting up?
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
