Divergences — Home Hub (atelier-dashboard.tsx)
🔴 Major — breaks a brand law
1. Wrong icon set (lucide-react, not Material Symbols) Every dashboard icon — calendar, arrow, Package, BarChart3, Users, UserPlus, ExternalLink, Copy, ChevronRight — is from lucide-react. The DS mandates Material Symbols Outlined, exclusively — no second icon set. Your sidebar (app-nav.tsx) already does this correctly; the dashboard doesn't, so the two are inconsistent. Fix: Swap to <span className="material-symbols-outlined"> (or the DS Icon component): calendar_month, arrow_forward, inventory_2, bar_chart, group, person_add, open_in_new, content_copy, chevron_right. Use FILL 1 for active/emphasis.

2. Terracotta used as a card background (Team card) The Team card is a full terracotta-tinted surface: bg-[#fff8f5], border-[#ffdbcf]/50, terracotta avatars, #9a6f64/#74584f text. The law: terracotta is rationed to avatars + at most one badge per viewport; never a section background or full card. Your viewport currently has 4+ terracotta instances (Step badge, Book-first-client icon tile, Team card bg, Team avatars). Fix: Make the Team card the same white sheet as the others (--al-surface-container-lowest, navy text, --al-surface-container icon tile). Keep the small terracotta avatar cluster — that's a legitimate avatar use. Drop terracotta from one of the two badges so only one remains per view.

🟠 Moderate — token / scale violations
3. Off-palette status pill (Sales & Growth "+14%") Uses Tailwind defaults bg-emerald-100 text-emerald-800. DS positive green is #0e7a55 on rgba(14,122,85,0.10). Fix: background: var(--al-status-positive-bg); color: var(--al-status-positive). (The red "12 Items Low" pill maps correctly to error-container/on-error-container — leave it, but it'll read as a status in a context that isn't really one; consider a muted pill.)

4. Numbers not in mono / tabular-nums "+14% This Month", "12 Items Low", "Step 1 of 2", and the booking URL are data the DS wants in JetBrains Mono with tabular-nums. They're rendering in Manrope. Fix: Apply font-mono tabular-nums (or .al-num) to the numeric pills and the URL string.

5. Card radius below the sheet spec Cards/sheets use rounded-2xl (16px). DS radius ladder: sheets = 24, controls 10–12, pills 9999. Fix: rounded-3xl (24px) on the four sheet-level cards. Keep rounded-xl (12px) on buttons and icon tiles.

6. Non-token shadows + hover-lift on cards Shadows are bespoke: shadow-[0px_10px_30px_rgba(26,28,27,0.04)] and ...0.03. The DS has exactly one card float: 0 20px 40px rgba(26,28,27,.04) (--al-shadow-float). Worse, the essentials cards add hover:shadow-[...] and icons do group-hover:scale-110 — DS says no hover-lift on cards and motion is deliberately still. Fix: Use --al-shadow-float on all sheets, remove the hover shadow swaps and the icon scale. Background-shift on hover (to --al-surface-container) is the sanctioned row/card hover.

7. Primary buttons are flat navy, not the gradient CTA "Connect Now" and "Open Booking Page" use bg-al-primary (flat #001e40). DS: every primary button is the 135deg → #003366 navy gradient with shadow --al-shadow-cta (0 14px 28px rgba(0,30,64,.2)). Your shadow is 0px_8px_24px_rgba(0,30,64,0.28). Fix: background: var(--al-gradient-cta); box-shadow: var(--al-shadow-cta). Better: use the DS Button component so this is automatic.

8. Hero title oversized text-5xl md:text-7xl = up to 72px. The editorial scale tops out at display-lg 56px (--al-display-lg); the page-title role is display-md 44px. Fix: Cap at --al-display-lg (56px). 72px overshoots the scale.

🟡 Minor — polish
9. Eyebrow tracking off-standard. Section kickers use tracking-[0.28em] and [0.22em]; the eyebrow motif is a fixed .2em (--al-track-eyebrow). Normalize all eyebrows to .2em.

10. Dividers use a surface color, not the hairline token. border-b border-al-surface-container-high (#e8e8e6) instead of the prescribed --al-hairline (rgba(195,198,209,.20)). Switch to the hairline token for the signature 1px divider.

11. Scattered hardcoded hex. #2a170f, #ffdbcf, #fdd8cb, #785c53, #93000a, #ffdad6 all map to existing tokens (--al-on-secondary-fixed, --al-secondary-fixed, --al-secondary-container, --al-on-secondary-container, --al-on-error-container, --al-error-container) — but #fff8f5 and #9a6f64 are off-palette entirely (see #2). Replace literals with token vars so the system stays the single source of truth.

12. Buttons lack the focus ring. The sidebar links have focus-visible:ring, but the dashboard's <Link>/<button> CTAs don't. DS recommends extending the input focus ring (--al-focus-ring) to interactive controls.