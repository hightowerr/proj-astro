import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { auth } from "@/lib/auth"

export default async function ResetPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/app")
  }

  return (
    <AuthShell
      heroHeadline="Almost There."
      heroBody="Choose a strong password and get back to doing what you love."
      formTitle="Set a new password"
      formSubtitle="Your reset link is valid for 1 hour."
    >
      {/* TODO: Stitch polish — replace simple loading copy with an Atelier skeleton or spinner if the reset form loads asynchronously. */}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
