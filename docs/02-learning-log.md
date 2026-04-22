# Learning Log: /src Code Patterns for PM → Developer

**Audience:** PM learning to code (knows Python, learning JavaScript/TypeScript)
**Date:** 2026-03-22 (Updated)
**Codebase:** Astro Booking System (Next.js 16, TypeScript, PostgreSQL)

---

## 0. Auth Redesign Bet (2026-04-10)

### What 3 patterns should I memorize for next time?

#### Pattern 1: Server Guard + Client Form Split
- **What it is:** Put access control on the server page, but keep the interactive form itself as a client component.
- **Where we used it:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`.
- **Why it matters:** The server decides "should this person even see this page?" before rendering. The client component only handles typing, button clicks, and local error state.
- **How to recognize it next time:** If a page needs both secure redirect logic and interactive form behavior, split them. In Python terms: think of the page as the secure Flask/Django view, and the form component as the small JavaScript widget inside it.

#### Pattern 2: Route-Specific Chrome Gating
- **What it is:** A global layout can still choose different wrappers for different route families.
- **Where we used it:** `src/components/layout/route-chrome.tsx`.
- **Why it matters:** `/app` and auth pages should not inherit the same marketing header/footer as the public site. We solved that by teaching the global chrome layer which routes should bypass marketing chrome entirely.
- **How to recognize it next time:** If a design says "this area of the product has its own shell," check the top-level layout first. The bug is often not inside the page itself, but in the shared wrapper above it.

#### Pattern 3: Visual Refactor, Logic Stable
- **What it is:** Change the presentation layer aggressively, but preserve the business behavior underneath.
- **Where we used it:** `src/components/auth/auth-shell.tsx`, `src/components/auth/sign-in-button.tsx`, `src/components/auth/sign-up-form.tsx`, `src/components/auth/forgot-password-form.tsx`, `src/components/auth/reset-password-form.tsx`.
- **Why it matters:** The auth redesign replaced cards with an editorial shell and replaced shadcn inputs/buttons with native elements, but we kept the same flows: redirect on existing session, password reset success, invalid-token handling, and post-auth navigation.
- **How to recognize it next time:** When a ticket is mostly design/UI, identify the "behavior contract" first and leave it untouched. Restyle the frame, not the rules.

### What 1 anti-pattern did we use that I should avoid?

#### Anti-Pattern: Duplicating Server Truth With a Client Loading Gate
- **What happened:** In `src/components/auth/sign-in-button.tsx` we originally hid the entire login form while `useSession().isPending` was loading, even though the server page had already checked the session and decided the user was unauthenticated.
- **Why it's bad:** This created a fake loading state and made the page feel broken for no real benefit.
- **Rule to memorize:** If the server already made the decision, don't add a second client-side gate unless it protects something the server truly cannot know.

### The Most Complex Technical Decision, Explained Like a PM

- **Decision:** Should auth pages use the normal site header/footer, or should they bypass the global marketing chrome and render inside their own dedicated shell?
- **Where it lives:** `src/app/layout.tsx`, `src/components/layout/route-chrome.tsx`, and `src/components/auth/auth-shell.tsx`.

**Plain-English version:**

Think of the app like a Python web app with one big base template:

- The global layout is like `base.html`.
- `RouteChrome` is a helper that says, "for most pages, wrap the content with the marketing nav and footer."
- `AuthShell` is a different template just for auth pages.

The hard part was this: even after we built the correct login page, the wrong header and footer still appeared. That happened because the bug was not inside `/login` itself. The bug was one level above it, in the shared wrapper.

So the real decision was:

1. Keep one universal wrapper for every route and try to style around it.
2. Teach the wrapper that auth routes are special and should skip the marketing chrome.

We chose option 2.

That was the right call because:
- It matches the design more closely.
- It keeps auth pages focused.
- It prevents repeated hacks inside each auth page.

**Python analogy:**

Imagine every Flask view automatically gets wrapped by a decorator that adds the public navbar and footer:

```python
@public_chrome
def login():
    return render_template("login.html")
```

If login should have a special shell, the clean fix is not to fight the decorator inside `login.html`. The clean fix is to change the wrapper logic so auth routes do not get `@public_chrome` in the first place.

That is exactly what `route-chrome.tsx` became: a route-aware wrapper selector.

### What to memorize from this bet in one sentence

- First decide which layer owns the rule: server page, shared layout, or client form. Most regressions happen when the same decision gets implemented in two layers.

---

## 1. Patterns to Memorise

### Pattern 1: The Configuration Snapshot (Immutability)
- **Why it matters:** Users expect that when they book something, the "rules" (like reminder times) are locked in. If a shop owner changes their settings later, it shouldn't retroactively change the behavior of existing bookings.
- **Where it appeared:** `src/lib/queries/appointments.ts` -> `createAppointment()`. We capture `reminderTimingsSnapshot` from the shop's settings at the moment of booking.
- **How to reuse it:** Whenever a requirement says **"Changes apply to new bookings only"** (Requirement R8 in our shaping doc), you must copy the relevant settings into the record itself during creation.

### Pattern 2: The Multi-Interval Cron Loop
- **Why it matters:** Handling reminders at different times (24h, 2h, 10m) usually tempts developers to write a massive, complex SQL query. Instead, looping through a list of intervals and running a simple query for each is much easier to read, test, and debug.
- **Where it appeared:** `src/lib/queries/appointments.ts` -> `findHighRiskAppointments()` and `findAppointmentsForEmailReminder()`.
- **How to reuse it:** When you have a list of relative time offsets (e.g., "send at 1 day, 1 hour, and 10 mins"), don't build one "God Query." Loop through the intervals and handle them one by one.

### Pattern 3: Contextual Deduplication Keys
- **Why it matters:** A generic dedup key like `reminder:email:123` would prevent the 2h reminder if the 24h reminder already sent. By including the *context* (the interval) in the key, you allow the system to send multiple distinct messages for the same event.
- **Where it appeared:** `src/lib/messages.ts` -> `sendAppointmentReminderEmail()`. We used `appointment_reminder_${interval}:email:${id}`.
- **How to reuse it:** If an event (an appointment) can trigger multiple notifications, your "Already Sent" check *must* include the specific reason or interval in its unique ID.

---

## 2. Anti-Pattern to Avoid

### Disparate Deduplication Strategies
- **What happened:** In this bet, Email reminders used the atomic `message_dedup` table (the "Zod Guard" of sending), but SMS reminders used a "Check-then-Write" pattern in `checkReminderAlreadySent`. 
- **Why to avoid it:** This creates a "Race Condition" risk. If two SMS crons ran at the exact same millisecond, they might both see "not sent" and send duplicate texts. Email is safe because the database itself blocks the second insert.
- **What to do instead:** Standardize on a single, atomic deduplication pattern (like the `message_dedup` table) for all communication channels.

---

## 3. Hardest Technical Decision Explained Simply

- **Decision:** Should we add columns to the `appointments` table (Shape A) or create a whole new `appointment_reminders` schedule table (Shape B)?
- **Plain-English explanation:** Imagine you have a calendar and you want to set 3 alarms for a meeting. 
    - **Shape A** is like writing "Alarm at 24h, 2h, 10m" in the notes of the calendar event itself. Every time you look at the event, you check if you should ring an alarm.
    - **Shape B** is like making 3 separate sticky notes and putting them on a "To-Do" wall sorted by time. You just look at the wall and do whatever is at the top.
- **Trade-off:** Shape B is "cleaner" and faster to query, but it requires much more work to set up and keep in sync if an appointment is moved or cancelled. Shape A is slightly slower to query but much simpler to build and keep accurate.
- **What the simpler but worse option would have been:** Just querying the shop's *current* settings every time the cron runs. This would be "worse" because if a shop owner changed their settings, every old appointment would suddenly follow the new rules, breaking the user's expectations.

---

## 4. What to Recognise Earlier Next Time

- **Signal 1: "Apply to new only"**: This is a loud signal for **Snapshotting**. Don't wait until the implementation phase to decide where to store the snapshot; put it in the schema during shaping.
- **Signal 2: "Multiple touchpoints"**: If you hear "send a reminder at X and Y," immediately think **Contextual Dedup**. Your current "one-and-done" messaging system will need to be updated to handle specific intervals.
- **Signal 3: "Relative Time Offsets"**: When a feature depends on "X minutes before Y happens," look for the **Skip Logic** smell. You'll need a helper like `shouldSkipReminder` to handle cases where someone books an appointment *after* a reminder window has already passed.

---

*Note: Content below this line is preserved from previous logs.*

---

## 5. Three Patterns to Memorize for Next Time (March 19)

### Pattern 1: Input Validation at API Boundaries (The Zod Guard)
**Where I saw it:** `src/app/api/bookings/create/route.ts:20-30`
**Why it matters:** Never trust user input. Think of Zod schemas as **"contracts at the gate"**.

### Pattern 2: Message/Template Versioning System (The Time Machine)
**Where I saw it:** `src/lib/messages.ts:14-80`
**Why it matters:** Versioning allows you to change templates without breaking old appointments. This is like **"track changes" for messages**.

### Pattern 3: Database Transactions (The All-or-Nothing Promise)
**Where I saw it:** `src/lib/queries/appointments.ts:630-850`
**Why it matters:** Transactions are like **"undo if anything goes wrong"**. No payment = No appointment.

---

## 6. One Anti-Pattern We Used (That I Should Avoid)

### Anti-Pattern: The "God Function" (Functions That Do Too Much)
**Where I saw it:** `src/lib/queries/appointments.ts` - `createAppointment()` (220 lines).
**Why it's bad:** Impossible to test, hard to debug, and violates the **Single Responsibility Principle**. Break big meetings into focused 30-minute sessions; break big functions into focused helpers.

---

## 7. Dashboard UI Bet (2026-04-22)

### What 3 patterns should I memorize for next time?

#### Pattern 1: Parallel Data Fetching (`Promise.all`)
- **What it is:** Running multiple independent database queries at the same time instead of waiting for each one to finish before starting the next.
- **Where we used it:** `getDashboardData` (fetching appointments, stats, and distribution) and `getDashboardDailyLog` (fetching from 3 different sources).
- **Why it matters:** It makes the page load significantly faster. If you have 3 queries that take 200ms each, sequential execution takes 600ms. Parallel execution takes only 200ms.
- **Python Analogy:** This is exactly like using `asyncio.gather(*tasks)` in Python. Don't make the user wait for "Book A" to finish before you even open "Book B."

#### Pattern 2: The "Breadcrumb" UI State (Query Parameters)
- **What it is:** Storing the current view or tab in the URL (e.g., `?view=log`) rather than just in the computer's temporary memory.
- **Where we used it:** `src/app/app/dashboard/page.tsx` to toggle between the "Quick View" and "Daily Log."
- **Why it matters:** It respects the user's "Back" button and allows them to refresh the page without losing their place. It also lets them bookmark a specific dashboard tab.
- **How to recognize it next time:** If you find yourself saying "I need a button to switch this section of the page," ask if that switch should be part of the URL.

#### Pattern 3: Discriminated Unions for Unified Navigation
- **What it is:** Creating a single list that can hold different "kinds" of things (like Customers and Appointments), where each item has a tag telling you what it is.
- **Where we used it:** `src/components/dashboard/dashboard-search.tsx`. We combined search results into one `allItems` list.
- **Why it matters:** It makes things like keyboard navigation (up/down arrows) much simpler. Instead of jumping between two different lists, you just move up and down one single list that "knows" how to handle each item type.

### What 1 anti-pattern did we use that I should avoid?

#### Anti-Pattern: "Shadow Types" (The Integrity Gap)
- **What happened:** In Bet 1, we found that the code *claimed* an appointment had a `customerId` (in the TypeScript interface), but the database query didn't actually select it. 
- **Why it's bad:** The computer "trusted" the type and didn't warn us, but the app would have crashed at runtime when trying to use that missing data. It’s like having a recipe that lists "Eggs" in the ingredients but never tells you to take them out of the fridge.
- **Rule to memorize:** Your database `SELECT` statement and your TypeScript `interface` must be mirrors of each other. If you add it to the type, you MUST add it to the query.

### The Most Complex Technical Decision, Explained Like a PM

- **Decision:** Performing an "In-Memory Merge" for the Daily Log instead of using a complex SQL query.
- **Where it lives:** `src/lib/queries/dashboard.ts` -> `getDashboardDailyLog()`.

**Plain-English version:**

Imagine your studio has three separate paper books: a "New Bookings" book, a "Cancellations" notebook, and a "Sent Messages" file. We needed to show a single "Timeline" of the last 7 days.

We had two main choices:
1.  **The "Unified Binder" (SQL UNION):** Try to force all three books to have the exact same columns so we could photocopy them into one giant binder. This is hard because an "Email Sent" record doesn't have a "Price" or "Duration" like a booking does.
2.  **The "Smart Intern" (In-Memory Merge):** Ask an intern to open all three books, look at the last 7 days in each, write every event down on a fresh sheet of paper, and then sort that list by time.

We chose option 2 (The Smart Intern).

**Python Analogy:**

Instead of one giant, scary SQL query, we wrote three simple, fast ones and then used a standard Python-style sort:

```python
# 1. Grab data from different tables
bookings = db.query("SELECT * FROM appointments WHERE created_at > 7_days_ago")
events = db.query("SELECT * FROM appointment_events WHERE occurred_at > 7_days_ago")
messages = db.query("SELECT * FROM message_log WHERE sent_at > 7_days_ago")

# 2. The "Merge" (The Intern's Job)
# We put them all in one big list and sort by time (newest first)
daily_log = sorted(bookings + events + messages, key=lambda x: x.timestamp, reverse=True)

# 3. Just show the top 50 items
return daily_log[:50]
```

This was the right decision because it kept our database simple and flexible. If we want to add a fourth source (like "Staff Logins") tomorrow, we just add one more simple query to the list without rewriting a giant master query.

---