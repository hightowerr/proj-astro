import { describe, expect, it } from "vitest"
import { getTrustedAuthOrigins } from "../auth-origins"

describe("getTrustedAuthOrigins", () => {
  it("includes preview and production vercel origins alongside the configured app URL", () => {
    expect(
      getTrustedAuthOrigins({
        NEXT_PUBLIC_APP_URL: "https://astro.example.com/",
        VERCEL_URL: "proj-astro-git-buffer-hightowerrs-projects.vercel.app",
        VERCEL_BRANCH_URL: "proj-astro-git-main-hightowerrs-projects.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "astro.example.com",
        NODE_ENV: "production",
      }),
    ).toEqual([
      "https://astro.example.com",
      "https://proj-astro-git-buffer-hightowerrs-projects.vercel.app",
      "https://proj-astro-git-main-hightowerrs-projects.vercel.app",
    ])
  })

  it("includes localhost during non-production development", () => {
    expect(
      getTrustedAuthOrigins({
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
        NODE_ENV: "development",
      }),
    ).toEqual([
      "http://127.0.0.1:3000",
      "http://localhost:3000",
    ])
  })

  it("returns undefined when no valid origins are configured", () => {
    expect(
      getTrustedAuthOrigins({
        NEXT_PUBLIC_APP_URL: "not-a-url",
        NODE_ENV: "production",
      }),
    ).toBeUndefined()
  })
})
