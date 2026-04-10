import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignInButton } from "@/components/auth/sign-in-button"
import { auth } from "@/lib/auth"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/app")
  }

  const { reset } = await searchParams

  return (
    <AuthShell
      heroHeadline="The Modern Atelier."
      heroBody="Elevate your appointment experience with precision tools designed for the artisan."
      formTitle="Log in"
      formSubtitle="Welcome back. Please enter your details."
    >
      <>
        {/* BOUNDARY: auth-redesign-v1 keeps email/password-only sign-in and the existing form component behavior. */}
        {reset === "success" && (
          <div className="mb-4 rounded-xl bg-muted px-4 py-3 text-sm text-primary">
            Password reset successfully. Please sign in with your new password.
          </div>
        )}
        <SignInButton />
      </>
    </AuthShell>
  )
}
