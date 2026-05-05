"use client"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function SignInButton() {
  const signIn = () => {
    authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
      errorCallbackURL: "/",
    })
  }

  return (
    <Button onClick={signIn} size="lg">
      Sign in with GitHub
    </Button>
  )
}
