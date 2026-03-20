# Questionnaire: Customizable Reminder Timing Analysis

To ensure a deep and robust analysis, please answer the following 5 questions:

1. **Current System Behavior:** Is there a currently implemented hardcoded behavior for reminders? If so, what is it (e.g., "always 24h before")?
2. **Priority Businesses:** Beyond the mentioned therapists, hairstylists, and mechanics, are there any other specific business models that are high-priority for this release?
3. **Appetite Drivers:** What is the primary driver behind the 1-2 week appetite? Is it a hard deadline or a strategic decision to limit complexity?
4. **Idempotency Details:** How do we currently track "sent" state for reminders? Is there an existing `reminders` table or a flag on the `appointments` table?
5. **Customer Feedback:** Have customers (the end recipients) expressed any specific pain points related to the timing of current reminders?
