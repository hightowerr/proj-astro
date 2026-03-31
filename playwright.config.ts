import path from "path";
import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const parsedBaseURL = new URL(baseURL);
const isLocalBaseURL = ["localhost", "127.0.0.1"].includes(parsedBaseURL.hostname);
const port = parsedBaseURL.port || "3000";
const devServerCommand = port === "3000" ? "pnpm dev" : `PORT=${port} pnpm dev`;
const webServerCommand =
  process.env.PLAYWRIGHT_SKIP_MIGRATIONS === "true"
    ? devServerCommand
    : `pnpm db:migrate && ${devServerCommand}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";
const webServerEnv = Object.fromEntries(
  Object.entries({
    ...process.env,
    PLAYWRIGHT: "true",
    NEXT_PUBLIC_PLAYWRIGHT: "true",
    STRIPE_MOCKED: "true",
    NEXT_PUBLIC_PLAYWRIGHT_STRIPE_BYPASS: "true",
    TWILIO_TEST_MODE: "true",
    TWILIO_TEST_FROM_NUMBER: process.env.TWILIO_TEST_FROM_NUMBER ?? "+15005550006",
    NEXT_PUBLIC_APP_URL: baseURL,
    APP_URL: baseURL,
    NEXT_DIST_DIR: ".next-playwright",
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);
const localWebServer = isLocalBaseURL
  ? {
      command: webServerCommand,
      url: baseURL,
      reuseExistingServer,
      timeout: 180 * 1000,
      env: webServerEnv,
    }
  : null;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/*.test.ts"],
  use: {
    baseURL,
  },
  ...(localWebServer ? { webServer: localWebServer } : {}),
});
