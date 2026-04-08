import { createAuthClient } from "better-auth/react"

const authClientBaseURL = typeof window === "undefined"
  ? (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  : window.location.origin

export const authClient = createAuthClient({
  baseURL: authClientBaseURL,
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient
