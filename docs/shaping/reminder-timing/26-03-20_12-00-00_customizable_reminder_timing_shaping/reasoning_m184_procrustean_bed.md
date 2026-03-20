# Reasoning: Procrustean Bed (m184_procrustean_bed.md)

## 1. Name the Forced Fit
The "Procrustean Bed" here is the **limit of 7 preset intervals** (15m, 1h, 2h, 4h, 24h, 48h, 1w). We are forcing all businesses into these simplified buckets to keep the UI and logic "lean."

## 2. Check for Nonlinearity
- **The "Recruiter/Call-based" Case:** For calls scheduled via tools like Calendly, a "15-minute before" reminder is high-value for reducing no-shows (linear improvement). However, what if they need a "30-minute" or "5-minute" reminder? Does "15 minutes" represent a threshold that meets 80% of needs, or is it a "stretch/cut" that alienates them?
- **The "Therapist/Prep" Case:** A therapist might need a "48-hour" window to prepare. If their prep actually takes 3 days, forcing them into a "48h" or "1w" bucket might lead to them missing their prep window (nonlinear failure).

## 3. Identify What Variability Carries
Variation in reminder timing carries information about the **business's internal prep requirements** and the **customer's attention span**. Forcing a "1h" reminder when a business needs a "2h" window (due to a commute or travel time) is a distortion that can lead to no-shows.

## 4. Preserve Heterogeneity (Recommendations)
1. **Validate Presets Against Top Personas:**
   - **Stylists/Service:** 2h, 4h, 24h (Presets fit well).
   - **Therapists/Clinics:** 24h, 48h (Presets fit well).
   - **Recruiters/Calls:** 15m, 1h (15m might be "stretching" it; many call tools use 10m/5m). 
   - **Mechanics:** 1w (Preset fits well).
2. **Recommendation:** Add a **"10-minute" preset** specifically for the recruiter/call-based persona, or ensure the "15-minute" one is validated against their specific needs.
3. **Local Adaptation:** Allow the "Small Batch" to stick to presets, but **ensure the data schema is generic enough** (e.g., store intervals as total minutes or ISO duration strings) so that *if* we need custom intervals in the future, we aren't "locked in" to a hardcoded enum structure.

## 5. Prefer Subtractive Fixes
Instead of adding a "custom interval" field now (complexity), **remove the "15m" and replace with "10m"** *if* the recruiter persona strongly favors 10m over 15m. This keeps the complexity constant while improving the "fit."

## 6. Coaching Question Check
"What are we forcing to fit our plan that doesn't naturally fit?" 
- Answer: We're forcing the "Recruiter/Call" persona into a 15-minute bucket when 10-minutes might be their industry standard. We should confirm if "15m" is sufficient.
