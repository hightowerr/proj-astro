import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { auth } from "@/lib/auth"

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/app")
  }

  return (
    <AuthShell
      heroHeadline="Your Studio Starts Here."
      heroBody="Join the platform built for beauty professionals who take their craft seriously."
      formTitle="Create an account"
      formSubtitle="Set up your account and you'll be booking in minutes."
    >
      <SignUpForm />
    </AuthShell>
  )
}
