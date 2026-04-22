# Environment Variables & Setup

Copy `env.example` to `.env` and populate the following values.

## Core Database & Auth
* `POSTGRES_URL`: PostgreSQL connection string (e.g., `postgresql://dev_user:dev_password@localhost:5432/postgres_dev`).
* `BETTER_AUTH_SECRET`: Secret for securing user sessions.
* `CRON_SECRET`: Used to authenticate automated background requests.
* `NEXT_PUBLIC_APP_URL`: Public app URL for generating links and redirects.

## Third-Party Integrations
* **Stripe:** * `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
* **Twilio:** * `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  * *Note:* Set `TWILIO_TEST_MODE=true` for E2E tests (uses magic numbers to avoid charges).
* **Resend (Email):** * `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`
* **Upstash Redis:** * `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Optional Features
* **AI Chat:** `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
* **Storage:** `BLOB_READ_WRITE_TOKEN` (Falls back to local storage if unset).
* **Google Calendar:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CALENDAR_ENCRYPTION_KEY`.