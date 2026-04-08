# No-Show Prevention Dashboard — Demo Script

A comprehensive guide for demonstrating the dashboard to clients (shop owners).

---

## Pre-Demo Setup (15 minutes before)

### 1. Test Data Setup

Create realistic test data that tells a compelling story:

```sql
-- Create 3 customer personas with different risk profiles

-- PERSONA 1: "Reliable Rachel" - Top tier customer
INSERT INTO customers (phone, email, name, tier, score, voided_last_90_days, total_bookings, total_voids)
VALUES ('+15551234001', 'rachel@example.com', 'Rachel Martinez', 'top', 95, 0, 24, 0);

-- PERSONA 2: "Neutral Nathan" - Average customer
INSERT INTO customers (phone, email, name, tier, score, voided_last_90_days, total_bookings, total_voids)
VALUES ('+15551234002', 'nathan@example.com', 'Nathan Chen', 'neutral', 65, 0, 8, 1);

-- PERSONA 3: "Risky Rita" - Problem customer
INSERT INTO customers (phone, email, name, tier, score, voided_last_90_days, total_bookings, total_voids)
VALUES ('+15551234003', 'rita@example.com', 'Rita Johnson', 'risk', 28, 3, 12, 7);

-- Create appointments for each persona
-- Rachel: Confirmed appointment (no action needed)
-- Nathan: Appointment in 5 days (neutral, no confirmation)
-- Rita: High-risk appointment in 2 days (needs attention!)
```

### 2. Pre-Demo Checklist

- [ ] Test data loaded with realistic customer names
- [ ] At least 2-3 high-risk appointments in "Attention Required"
- [ ] One appointment with confirmationStatus='pending' (yellow badge)
- [ ] One appointment with confirmationStatus='confirmed' (green badge)
- [ ] Summary cards showing real numbers (not all zeros)
- [ ] Twilio test credentials configured
- [ ] Phone ready to receive test SMS
- [ ] Browser zoom at 100% (not 110% or 90%)
- [ ] Close all unnecessary browser tabs
- [ ] Prepare coffee/water ☕

### 3. Demo Environment

- Use **staging environment** (not production!)
- URL: `https://demo.yourapp.com/app/dashboard`
- Test phone number ready: Your phone that receives SMS
- Backup: Screenshots of each step in case of technical issues

---

## Demo Script

**Total Time: 15 minutes**

### Introduction (2 minutes)

**[Screen: Landing page, not yet logged in]**

**You:**
> "Thanks for joining me today! I'm excited to show you how [App Name] can help you eliminate no-shows and protect your revenue.
>
> Before we dive in, can I ask — about how many appointments do you typically lose to no-shows each month?"

**[Listen to their pain point, acknowledge it]**

**You:**
> "That's frustrating, and it's exactly what we built this for. What makes us different from other booking systems is that we don't just *track* no-shows — we actively *prevent* them using customer trust scoring.
>
> Let me show you what that looks like from a shop owner's perspective. I'll log in as a demo shop owner..."

**[Log in, navigate to dashboard]**

---

### Part 1: The Dashboard Overview (3 minutes)

**[Screen: Dashboard loads — /app/dashboard]**

**You:**
> "So this is what you see the moment you log in. Instead of showing you generic metrics like 'total revenue' or 'appointments this week,' we immediately surface what matters most: **which appointments are at risk.**
>
> See this section at the top? This is your 'Attention Required' list. These are appointments where the customer has a history of no-shows or late cancellations — the ones you need to watch."

**[Point to Attention Required table]**

**Key points to highlight:**

1. **Tier badges**: "See these colored badges? Green = reliable customers, Yellow = average, Red = risky. This is based on their actual booking history."

2. **Risk indicators**: "Look at this customer — Rita Johnson. Her risk score is 28 out of 100, and she's had 3 no-shows in the last 90 days. The system automatically flags her appointments."

3. **Time period selector**: "You can adjust this window — next 24 hours, 3 days, 7 days — depending on how proactive you want to be."

**[Change time period from "Next 7 days" to "Next 24 hours"]**

**You:**
> "So if I'm checking this in the morning, I can see just what needs my attention TODAY."

**[Scroll down to Summary Cards]**

**You:**
> "These cards give you the big picture. You've got 47 upcoming appointments, but 8 of them are high-risk. More importantly, see this number? $420 in deposits at risk. That's money you could lose if these customers don't show up.
>
> And this monthly stat shows you're already protecting your revenue — you've retained $1,200 in deposits this month from late cancellations."

**[Point to Tier Distribution Chart]**

**You:**
> "This chart shows the health of your customer base. Most booking systems don't give you this visibility. You can see you've got 65% reliable customers, 25% average, and 10% risky. If that red slice starts growing, you know you need to adjust your policies."

---

### Part 2: Taking Action (4 minutes)

**[Screen: Still on dashboard, Attention Required section]**

**You:**
> "Now here's where it gets powerful. For every high-risk appointment, you have immediate actions you can take — no extra clicks, no navigating through menus."

**[Point to action buttons on Rita's appointment]**

**Key actions to demo:**

#### Action 1: View Details

**[Click "View" button]**

**You:**
> "If I click View, I can see the full appointment details — customer history, what they've booked, etc."

**[Show appointment detail page briefly, then go back to dashboard]**

#### Action 2: Contact Info

**[Click "Contact" button]**

**You:**
> "If I need to reach them, I just click Contact and boom — phone and email right here. I can copy either one with a single click."

**[Click copy button next to phone]**

**You:**
> "See that? Copied to clipboard. Makes it super easy to call or text them manually if needed."

**[Click outside popover to close it]**

#### Action 3: Send Reminder

**[Click "Remind" button]**

**You:**
> "But here's where automation kicks in. If I want to send them a friendly reminder, I just click Remind..."

**[Button changes to "Sending...", then toast appears: "Reminder sent!"]**

**You:**
> "...and they instantly get an SMS with the appointment details and a link to manage their booking. No manual texting, no copy-pasting."

**[Show your phone receiving the SMS — have it ready]**

**[Read SMS aloud]:**
> "Reminder: You have an appointment at Demo Salon on March 15 at 2:30 PM. Manage your booking: [link]"

---

### Part 3: Confirmation System (4 minutes)

**[Screen: Back to dashboard, still on Rita's appointment]**

**You:**
> "Now, for your highest-risk customers, we have something even more powerful: the confirmation system. Let me show you how this works..."

**[Point to Rita's appointment with Confirmation status = "None"]**

#### Manual Confirmation

**[Click "Confirm" button]**

**You:**
> "If I click Confirm, the system sends them a special SMS that requires a response. Watch what happens..."

**[Button changes to "Sending...", toast appears: "Confirmation request sent!"]**

**[Status badge changes from gray "None" to yellow "Pending"]**

**You:**
> "See how the status changed to 'Pending'? Now we're waiting for the customer to confirm. Let me show you what they received."

**[Show phone with SMS]**

**[Read SMS aloud]:**
> "Reply YES to confirm your appointment at Demo Salon on March 15 at 2:30 PM or it will be cancelled."

**You:**
> "This is crucial — we're making them actively commit. If they don't respond, we know they're probably not coming."

#### Customer Confirms

**[Have your phone ready, type "YES" and send]**

**You:**
> "So let's say Rita replies 'YES'..."

**[Send the SMS, wait 2 seconds]**

**[Refresh dashboard — status changes to green "Confirmed"]**

**You:**
> "Boom. Status updates to Confirmed. Now you know she's committed. And she gets a confirmation message back."

**[Show confirmation SMS on phone: "Thanks! Your appointment is confirmed."]**

#### What if they don't confirm?

**[Point to another appointment with expired confirmation]**

**You:**
> "Now, what if they DON'T respond? See this appointment here with the red 'Expired' badge? This customer never replied, so after 24 hours, the system automatically cancelled the appointment and refunded them.
>
> But here's the beautiful part — it didn't just cancel and leave you with an empty slot. It triggered our slot recovery system, which automatically offers that slot to waitlisted customers based on their trust score. Top-tier customers get first dibs."

**[Pause for effect]**

**You:**
> "So a no-show that would've cost you money just became an opportunity to book a reliable customer instead."

---

### Part 4: Automation (2 minutes)

**[Screen: Still on dashboard]**

**You:**
> "Now, everything I just showed you — the reminders, the confirmations — you can also set to run automatically. Let me explain how that works..."

**[Open a browser tab to show vercel.json or settings — optional]**

**You:**
> "The system runs two jobs every hour in the background:
>
> **Job 1:** For any high-risk customer with an appointment 24 to 48 hours away, it automatically sends them a confirmation request. You don't have to remember to do it.
>
> **Job 2:** For any customer who hasn't confirmed within 24 hours, it automatically cancels the appointment, issues a refund, and triggers slot recovery.
>
> So you're essentially running a hands-off no-show prevention system. You can still intervene manually if you want, but the system has your back."

**[Go back to dashboard]**

**You:**
> "And you see the results right here in your dashboard every morning. Who needs attention today? Who's confirmed? Who's at risk?"

---

### Closing (2 minutes)

**[Screen: Dashboard overview]**

**You:**
> "So to recap, what you're getting here is:
>
> 1. **Visibility** — You immediately know which appointments are risky based on actual customer behavior, not guesses.
>
> 2. **Action** — You can send reminders, request confirmations, view details, all from one screen with one click.
>
> 3. **Automation** — High-risk customers get confirmations automatically. Non-responders get cancelled automatically. Slots get recovered automatically.
>
> 4. **Revenue protection** — You see exactly how much money is at risk and how much you've saved.
>
> The result? Fewer no-shows, less wasted time, more revenue. And it all happens without you micromanaging every appointment."

**[Pause]**

**You:**
> "Questions so far? Or would you like me to show you how the booking flow works from a customer's perspective?"

---

## Handling Common Questions

### Q: "How do you calculate the trust score?"

**A:**
> "Great question. The score is based on three things:
> 1. **Completion rate** — How many appointments they actually showed up for
> 2. **Cancellation behavior** — Did they cancel with enough notice, or at the last minute?
> 3. **Recent history** — What happened in the last 90 days weighs more heavily
>
> The system updates these scores automatically after every appointment, so you always have current data."

### Q: "What if a good customer has one no-show? Do they get flagged?"

**A:**
> "No, and that's the beauty of the scoring system. One mistake doesn't ruin them. A top-tier customer with 20 successful appointments who has one no-show might drop from a 95 to an 88, but they'd still be in the 'top' tier.
>
> It takes a pattern of bad behavior — multiple no-shows, repeated late cancellations — to drop someone into the 'risk' category."

### Q: "Can I customize the confirmation message?"

**A (Current state):**
> "Not yet in this version, but that's on our roadmap. For now, the message is optimized based on what we've found gets the best response rates."

**A (Future state, if you build it):**
> "Absolutely. You can customize the message, the timing (24-48 hours), and even disable it for certain customers if you want."

### Q: "What if they reply with something other than YES?"

**A:**
> "The system only recognizes 'YES' (case-insensitive) as a confirmation. If they reply with anything else, it doesn't count, and the confirmation still expires after 24 hours. This is intentional — we want clear commitment, not ambiguity."

### Q: "Does this work with my existing calendar?"

**A:**
> "We're building Google Calendar integration now, which will sync appointments automatically. In the meantime, appointments created through your booking page show up here in the dashboard, and you can view them in the built-in calendar view."

### Q: "How much does this cost?"

**A:**
> "[Your pricing model]. The way we think about it is — if this prevents even ONE $100 appointment no-show per month, it's already paid for itself. Most shops see 3-5x ROI in the first month."

---

## Demo Backup Plan

### If SMS doesn't arrive in real-time:

**You:**
> "The SMS usually arrives in 1-2 seconds, but sometimes carrier delays happen. Let me show you a screenshot of what the customer receives..."

**[Have screenshots ready in slides/images]**

### If confirmation status doesn't update immediately:

**You:**
> "The status updates should happen instantly, but let me refresh the page..."

**[F5 to refresh]**

**[If still not updating]:**

**You:**
> "Looks like we're hitting a demo environment delay. In production this is instant, but let me show you what it looks like when it updates..."

**[Show screenshot or video]**

### If dashboard is empty (no test data):

**You:**
> "Looks like our test data didn't load — let me switch to our prepared demo environment..."

**[Have a backup staging URL with guaranteed data]**

---

## Post-Demo Follow-Up

### Immediate Next Steps

After the demo, ask:

1. **"On a scale of 1-10, how much of a problem are no-shows for your business right now?"**

2. **"Which part of what I showed you would have the biggest impact for you?"**
   - Listen for: automation, visibility, or action buttons

3. **"What questions do you have before we move forward?"**

### Send Follow-Up Email

Within 1 hour, send:

**Subject:** "No-Show Prevention Dashboard Demo - [Shop Name]"

**Body:**
```
Hi [Name],

Thanks for taking the time to see the dashboard demo today!

As a quick recap, you'd get:
- Automatic trust scoring for all your customers
- Real-time visibility into high-risk appointments
- One-click actions (remind, confirm, cancel)
- Automated confirmation requests for risky customers
- Automatic slot recovery when cancellations happen

Based on your current [X] appointments per month with [Y]% no-show rate,
we estimate this could save you $[Z] per month in lost revenue.

Next steps:
1. [Schedule onboarding call / Start free trial / Sign contract]
2. [Timeline for implementation]

Let me know if you have any questions!

[Your name]

P.S. Here's a recording of today's demo: [Link]
```

---

## Pro Tips for a Great Demo

### Do's ✅

1. **Let them drive questions** — Pause after each section
2. **Use their real pain points** — Reference what they said in intro
3. **Show, don't tell** — Click buttons, send real SMS, update real data
4. **Keep pace brisk** — 15 minutes max, not 30
5. **End with clear next steps** — Don't leave them wondering "what now?"

### Don'ts ❌

1. **Don't apologize for unfinished features** — Focus on what works
2. **Don't read from script** — Use it as a guide, not a teleprompter
3. **Don't skip the story** — Start with their pain, end with relief
4. **Don't demo features they don't need** — If they don't use SMS, skip that
5. **Don't oversell** — Let the product speak for itself

---

## Demo Success Metrics

Track after each demo:

- **Time to "wow" moment** — How long until they react positively? (Target: <3 min)
- **Questions asked** — More questions = more engagement
- **Next step conversion** — Did they book a trial/call/contract? (Target: >60%)
- **Feature resonance** — Which part did they react to most?

Use this data to refine the demo over time.

---

## Appendix: Demo Checklist (Print This!)

**30 min before:**
- [ ] Load test data
- [ ] Test SMS delivery
- [ ] Check all action buttons work
- [ ] Verify confirmation flow works end-to-end
- [ ] Close unnecessary browser tabs
- [ ] Silence phone notifications
- [ ] Have backup screenshots ready

**5 min before:**
- [ ] Zoom at 100%
- [ ] Dashboard loaded
- [ ] Phone unlocked and ready
- [ ] Water nearby
- [ ] Deep breath 😊

**During demo:**
- [ ] Ask about their no-show pain (intro)
- [ ] Show Attention Required (high-risk visibility)
- [ ] Demo action buttons (View, Contact, Remind)
- [ ] Send live confirmation SMS
- [ ] Reply YES and show status update
- [ ] Explain automation (cron jobs)
- [ ] Recap value (prevent, not just track)
- [ ] Ask for next steps

**After demo:**
- [ ] Send follow-up email (within 1 hour)
- [ ] Update CRM with demo notes
- [ ] Record what resonated / what flopped
- [ ] Schedule follow-up call if interested

---

Good luck with your demo! 🎉
