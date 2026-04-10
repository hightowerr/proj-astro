import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { auth } from "@/lib/auth"

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/app")
  }

  return (
    <AuthShell
      heroHeadline="We've Got You."
      heroBody="A fresh start is just one email away."
      formTitle="Reset your password"
      formSubtitle="Enter your email and we'll send a reset link to your terminal."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
