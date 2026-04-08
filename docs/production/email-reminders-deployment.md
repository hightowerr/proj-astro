# Email Reminders Production Deployment Checklist

## Environment

- Set `RESEND_API_KEY` in Vercel.
- Set `EMAIL_FROM_ADDRESS` to a verified sender/domain in Resend.
- Set `CRON_SECRET` and keep it consistent with your protected cron routes.
- Confirm `POSTGRES_URL` is pointed at the production database.

## Resend

- Verify the sending domain in Resend before enabling production traffic.
- Check SPF and DKIM records are present and verified.
- Send a staging test email from the final sender address.

## Database

- Confirm the V2 email reminder migration has been applied.
- Verify `customer_contact_prefs.email_opt_in` exists.
- Verify `message_channel` includes `email`.
- Verify an `appointment_reminder_24h` template exists for the `email` channel.

## Scheduling

- Confirm [vercel.json](/home/yunix/learning-agentic/ideas/proj-astro/vercel.json) includes `/api/jobs/send-email-reminders` on `0 2 * * *`.
- After deployment, verify the cron appears as active in Vercel.
- Trigger the endpoint manually once in staging with the correct `x-cron-secret`.

## Monitoring

- Watch Vercel function logs for `/api/jobs/send-email-reminders`.
- Watch Resend delivery metrics for bounce and failure spikes.
- Query `message_log` for `channel = 'email'` and `purpose = 'appointment_reminder_24h'`.
- Alert on repeated cron failures or abnormal email failure rates.

## Functional Checks

- Book a staging appointment roughly 24 hours in the future with email reminders enabled.
- Trigger the cron route and confirm a `sent` row lands in `message_log`.
- Visit the manage page and opt out.
- Confirm `customer_contact_prefs.email_opt_in` becomes `false`.
- Trigger the cron route again and confirm no new reminder is sent for that customer.
