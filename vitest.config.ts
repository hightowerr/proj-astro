import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,ts}"],
    exclude: [
      "node_modules/**",
      "dist/**",
      "tests/**", // Exclude Playwright E2E tests
      "**/test-results/**",
      "drizzle/**",
      "src/app/api/stripe/webhook/route.test.ts", // Requires DB setup
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.config.*",
        "**/*.d.ts",
        "**/test-results/**",
        "drizzle/**",
        "tests/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
