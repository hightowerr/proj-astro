import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System — Astro",
  description: "Astro Design System v2.0 — Deep Ledger",
};

/* ─── tiny inline helpers ─────────────────────────────────────── */

function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-8 flex items-center gap-4">
        <span
          className="font-mono text-[0.65rem] uppercase tracking-[0.18em]"
          style={{ color: "var(--color-brand)" }}
        >
          {label}
        </span>
        <div className="h-px flex-1" style={{ background: "var(--color-border-default)" }} />
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  value,
  cssVar,
  light = false,
}: {
  name: string;
  value: string;
  cssVar?: string;
  light?: boolean;
}) {
  return (
    <div className="group flex flex-col gap-2">
      <div
        className="h-14 w-full rounded-lg transition-transform duration-200 group-hover:scale-[1.03]"
        style={{ background: value }}
      />
      <div>
        <p
          className="text-[0.75rem] font-semibold"
          style={{ color: light ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}
        >
          {name}
        </p>
        {cssVar && (
          <p
            className="font-mono text-[0.625rem]"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {cssVar}
          </p>
        )}
        <p
          className="font-mono text-[0.625rem]"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function TypeSpecimen({
  label,
  cssVar,
  sample,
  weights,
}: {
  family?: string;
  label: string;
  cssVar: string;
  sample: string;
  weights: { weight: string; label: string }[];
}) {
  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      <div className="mb-6 flex items-baseline justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </span>
        <span
          className="font-mono text-[0.65rem] uppercase tracking-wider"
          style={{ color: "var(--color-brand)" }}
        >
          {cssVar}
        </span>
      </div>
      <p
        className="mb-6 text-4xl leading-tight"
        style={{ fontFamily: `var(${cssVar})`, color: "var(--color-text-primary)" }}
      >
        {sample}
      </p>
      <div className="flex flex-wrap gap-4">
        {weights.map((w) => (
          <div key={w.weight} className="flex flex-col gap-1">
            <span
              className="text-lg"
              style={{
                fontFamily: `var(${cssVar})`,
                fontWeight: w.weight,
                color: "var(--color-text-primary)",
              }}
            >
              Aa
            </span>
            <span
              className="font-mono text-[0.625rem]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {w.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────── */

export default function DesignSystemPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-surface-void)" }}
    >
      {/* ── Background grid ── */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-brand) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Hero ── */}
      <header
        className="relative overflow-hidden px-6 pb-24 pt-32 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(61,212,200,0.04) 0%, transparent 60%)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Glow orb */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "rgba(61,212,200,0.08)" }}
        />

        <div className="relative mx-auto max-w-3xl">
          <p
            className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.22em]"
            style={{ color: "var(--color-brand)" }}
          >
            Astro — v2.0
          </p>
          <h1
            className="mb-4 text-6xl font-light italic leading-none md:text-8xl"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            Deep Ledger
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Design System for Astro — professional booking management for beauty
            professionals. Every token, component, and pattern documented.
          </p>

          {/* Quick-nav pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {[
              "Color",
              "Typography",
              "Surfaces",
              "Spacing",
              "Shadows",
              "Motion",
              "Buttons",
              "Badges",
              "Tier System",
              "Status",
              "Cards",
              "Forms",
            ].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="mx-auto max-w-6xl space-y-24 px-6 py-24">

        {/* ═══════ COLOR ═══════ */}
        <Section id="color" label="01 — Color System">

          {/* Surfaces */}
          <div className="mb-12">
            <h3
              className="mb-5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Surface Hierarchy
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch name="Void"     value="#070a0f" cssVar="--color-surface-void" />
              <Swatch name="Base"     value="#0e1420" cssVar="--color-surface-base" />
              <Swatch name="Raised"   value="#161e2c" cssVar="--color-surface-raised" />
              <Swatch name="Overlay"  value="#1d2738" cssVar="--color-surface-overlay" />
              <Swatch name="Elevated" value="#253044" cssVar="--color-surface-elevated" />
              <Swatch name="Float"    value="#2e3a52" cssVar="--color-surface-float" />
            </div>
          </div>

          {/* Brand */}
          <div className="mb-12">
            <h3
              className="mb-5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Brand — Luminous Teal
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch name="Brand"        value="#3dd4c8" cssVar="--color-brand" />
              <Swatch name="Brand Hover"  value="#2abfb3" cssVar="--color-brand-hover" />
              <Swatch name="Brand Dim"    value="#1a9990" cssVar="--color-brand-dim" />
              <Swatch name="Subtle"       value="rgba(61,212,200,0.08)" cssVar="--color-brand-subtle" />
              <Swatch name="Border"       value="rgba(61,212,200,0.22)" cssVar="--color-brand-border" />
              <Swatch name="Glow"         value="rgba(61,212,200,0.14)" cssVar="--color-brand-glow" />
            </div>
          </div>

          {/* Semantic */}
          <div className="mb-12">
            <h3
              className="mb-5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Semantic Status
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { name: "Success", color: "#20d090", subtle: "rgba(32,208,144,0.1)", border: "rgba(32,208,144,0.26)" },
                { name: "Warning", color: "#e8a232", subtle: "rgba(232,162,50,0.1)", border: "rgba(232,162,50,0.26)" },
                { name: "Error",   color: "#f45878", subtle: "rgba(244,88,120,0.1)", border: "rgba(244,88,120,0.26)" },
                { name: "Info",    color: "#3dd4c8", subtle: "rgba(61,212,200,0.1)",  border: "rgba(61,212,200,0.26)" },
              ].map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl p-4"
                  style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {s.name}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 rounded-md" style={{ background: s.color }} />
                    <div className="h-8 rounded-md" style={{ background: s.subtle, border: `1px solid ${s.border}` }}>
                      <div className="flex h-full items-center justify-center">
                        <span className="font-mono text-[0.6rem]" style={{ color: s.color }}>
                          subtle / border
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Text scale */}
          <div>
            <h3
              className="mb-5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Text Scale
            </h3>
            <div
              className="space-y-1 rounded-xl p-6"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
            >
              {[
                { label: "--color-text-primary",   val: "#edf2f7", sample: "Primary — appointment confirmed" },
                { label: "--color-text-secondary",  val: "#8aa2bc", sample: "Secondary — customer details" },
                { label: "--color-text-tertiary",   val: "#485f74", sample: "Tertiary — metadata, timestamps" },
              ].map((t) => (
                <div key={t.label} className="flex items-baseline justify-between gap-4 py-2">
                  <span className="text-base" style={{ color: t.val }}>
                    {t.sample}
                  </span>
                  <span className="shrink-0 font-mono text-[0.625rem]" style={{ color: "var(--color-text-tertiary)" }}>
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ TYPOGRAPHY ═══════ */}
        <Section id="typography" label="02 — Typography">
          <div className="space-y-6">
            <TypeSpecimen
              label="Display — Cormorant Garamond"
              cssVar="--font-display"
              sample="Booking confirmed."
              weights={[
                { weight: "300", label: "Light 300" },
                { weight: "400", label: "Regular 400" },
                { weight: "500", label: "Medium 500" },
                { weight: "600", label: "SemiBold 600" },
                { weight: "700", label: "Bold 700" },
              ]}
            />
            <TypeSpecimen
              label="Body — Bricolage Grotesque"
              cssVar="--font-body"
              sample="Smart booking management."
              weights={[
                { weight: "200", label: "ExtraLight 200" },
                { weight: "400", label: "Regular 400" },
                { weight: "500", label: "Medium 500" },
                { weight: "600", label: "SemiBold 600" },
                { weight: "700", label: "Bold 700" },
                { weight: "800", label: "ExtraBold 800" },
              ]}
            />
            <TypeSpecimen
              label="Mono — Fira Code"
              cssVar="--font-mono"
              sample="txn_3P8q2f · +£120.00"
              weights={[
                { weight: "300", label: "Light 300" },
                { weight: "400", label: "Regular 400" },
                { weight: "500", label: "Medium 500" },
              ]}
            />
          </div>

          {/* Type scale */}
          <div className="mt-10">
            <h3
              className="mb-5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Type Scale
            </h3>
            <div
              className="rounded-xl p-8"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
            >
              {[
                { size: "text-7xl",  px: "72px", role: "Hero / Landing" },
                { size: "text-5xl",  px: "48px", role: "Page Title" },
                { size: "text-3xl",  px: "30px", role: "Section Title" },
                { size: "text-2xl",  px: "24px", role: "Card Heading" },
                { size: "text-xl",   px: "20px", role: "Subheading" },
                { size: "text-base", px: "16px", role: "Body Text" },
                { size: "text-sm",   px: "14px", role: "Secondary / Tables" },
                { size: "text-xs",   px: "12px", role: "Labels / Metadata" },
              ].map(({ size, px, role }) => (
                <div
                  key={size}
                  className="flex items-baseline justify-between gap-4 border-b py-3 last:border-0"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <span
                    className={`${size} leading-none`}
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
                  >
                    Appointment
                  </span>
                  <div className="shrink-0 text-right">
                    <span className="font-mono text-[0.65rem]" style={{ color: "var(--color-brand)" }}>
                      {px}
                    </span>
                    <span
                      className="ml-3 font-mono text-[0.6rem]"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ SURFACES ═══════ */}
        <Section id="surfaces" label="03 — Surfaces">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Default Card",
                bg: "var(--color-surface-raised)",
                border: "1px solid var(--color-border-default)",
                desc: "Standard content container",
              },
              {
                label: "Glass Card",
                bg: "rgba(22,30,44,0.65)",
                border: "1px solid rgba(255,255,255,0.08)",
                blur: true,
                desc: "Overlay / floating panels",
              },
              {
                label: "Brand Card",
                bg: "var(--color-surface-raised)",
                border: "1px solid var(--color-brand-border)",
                shadow: "var(--shadow-brand)",
                desc: "Highlighted / selected state",
              },
              {
                label: "Success Card",
                bg: "rgba(32,208,144,0.06)",
                border: "1px solid rgba(32,208,144,0.22)",
                desc: "Confirmation / success state",
              },
              {
                label: "Warning Card",
                bg: "rgba(232,162,50,0.06)",
                border: "1px solid rgba(232,162,50,0.22)",
                desc: "Attention required",
              },
              {
                label: "Error Card",
                bg: "rgba(244,88,120,0.06)",
                border: "1px solid rgba(244,88,120,0.22)",
                desc: "Error / risk state",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl p-6 transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  background: card.bg,
                  border: card.border,
                  boxShadow: card.shadow,
                  backdropFilter: card.blur ? "blur(12px)" : undefined,
                }}
              >
                <p
                  className="mb-1 text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {card.label}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════ SPACING ═══════ */}
        <Section id="spacing" label="04 — Spacing">
          <div
            className="rounded-xl p-8"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
          >
            <p className="mb-6 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              4px base grid. All spacing is a multiple of 4.
            </p>
            <div className="space-y-4">
              {[
                { token: "1",  px: "4px",   rem: "0.25rem" },
                { token: "2",  px: "8px",   rem: "0.5rem" },
                { token: "3",  px: "12px",  rem: "0.75rem" },
                { token: "4",  px: "16px",  rem: "1rem" },
                { token: "6",  px: "24px",  rem: "1.5rem" },
                { token: "8",  px: "32px",  rem: "2rem" },
                { token: "12", px: "48px",  rem: "3rem" },
                { token: "16", px: "64px",  rem: "4rem" },
                { token: "24", px: "96px",  rem: "6rem" },
              ].map(({ token, px, rem }) => (
                <div key={token} className="flex items-center gap-4">
                  <div
                    className="shrink-0 rounded"
                    style={{
                      width: px,
                      height: "16px",
                      background: "var(--color-brand-subtle)",
                      border: "1px solid var(--color-brand-border)",
                    }}
                  />
                  <div className="flex gap-4">
                    <span className="w-8 font-mono text-[0.7rem]" style={{ color: "var(--color-brand)" }}>
                      {token}
                    </span>
                    <span className="w-12 font-mono text-[0.7rem]" style={{ color: "var(--color-text-secondary)" }}>
                      {px}
                    </span>
                    <span className="font-mono text-[0.7rem]" style={{ color: "var(--color-text-tertiary)" }}>
                      {rem}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Border radius */}
          <div className="mt-8">
            <h3
              className="mb-5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Border Radius
            </h3>
            <div className="flex flex-wrap gap-6">
              {[
                { label: "sm",   val: "0.375rem" },
                { label: "md",   val: "0.5rem" },
                { label: "lg",   val: "0.625rem" },
                { label: "xl",   val: "0.875rem" },
                { label: "2xl",  val: "1rem" },
                { label: "3xl",  val: "1.5rem" },
                { label: "full", val: "9999px" },
              ].map(({ label, val }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="h-12 w-12"
                    style={{
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border-medium)",
                      borderRadius: val,
                    }}
                  />
                  <span className="font-mono text-[0.65rem]" style={{ color: "var(--color-text-secondary)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ SHADOWS ═══════ */}
        <Section id="shadows" label="05 — Shadows">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "xs",    val: "0 1px 2px rgba(0,0,0,0.5)" },
              { label: "sm",    val: "0 2px 6px rgba(0,0,0,0.5)" },
              { label: "md",    val: "0 4px 16px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)" },
              { label: "lg",    val: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.45)" },
              { label: "xl",    val: "0 16px 56px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)" },
              { label: "brand", val: "0 0 24px rgba(61,212,200,0.2), 0 4px 16px rgba(0,0,0,0.5)" },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col items-center gap-4">
                <div
                  className="h-16 w-full rounded-xl"
                  style={{
                    background: "var(--color-surface-raised)",
                    boxShadow: val,
                  }}
                />
                <span className="font-mono text-[0.7rem]" style={{ color: "var(--color-text-secondary)" }}>
                  --shadow-{label}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════ MOTION ═══════ */}
        <Section id="motion" label="06 — Motion">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Durations */}
            <div
              className="rounded-xl p-6"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
            >
              <h3
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Durations
              </h3>
              <div className="space-y-3">
                {[
                  { label: "instant", val: "80ms",  use: "Micro-interactions" },
                  { label: "fast",    val: "150ms", use: "Hover states" },
                  { label: "normal",  val: "250ms", use: "Transitions" },
                  { label: "slow",    val: "400ms", use: "Page reveals" },
                  { label: "slower",  val: "700ms", use: "Complex animations" },
                ].map(({ label, val, use }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: val,
                        background: "var(--color-brand)",
                        minWidth: "4px",
                      }}
                    />
                    <div className="flex gap-2">
                      <span className="w-16 font-mono text-[0.7rem]" style={{ color: "var(--color-brand)" }}>
                        {val}
                      </span>
                      <span className="font-mono text-[0.7rem]" style={{ color: "var(--color-text-tertiary)" }}>
                        {label} · {use}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Easing */}
            <div
              className="rounded-xl p-6"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
            >
              <h3
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Easing Curves
              </h3>
              <div className="space-y-4">
                {[
                  { label: "spring",  val: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "Bouncy reveals" },
                  { label: "smooth",  val: "cubic-bezier(0.16, 1, 0.3, 1)",     use: "Smooth exits" },
                  { label: "in-out",  val: "cubic-bezier(0.65, 0, 0.35, 1)",    use: "Crossfades" },
                ].map(({ label, val, use }) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between">
                      <span className="font-mono text-[0.7rem]" style={{ color: "var(--color-brand)" }}>
                        --ease-{label}
                      </span>
                      <span className="font-mono text-[0.6rem]" style={{ color: "var(--color-text-tertiary)" }}>
                        {use}
                      </span>
                    </div>
                    <p
                      className="font-mono text-[0.6rem] leading-relaxed"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════ BUTTONS ═══════ */}
        <Section id="buttons" label="07 — Buttons">
          <div
            className="rounded-2xl p-8"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
          >
            <div className="space-y-8">

              {/* Primary */}
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  Primary
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{
                      background: "var(--color-brand)",
                      color: "var(--color-surface-void)",
                      boxShadow: "0 0 0 0 var(--color-brand-glow)",
                    }}
                  >
                    Confirm Booking
                  </button>
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150 opacity-60 cursor-not-allowed"
                    style={{ background: "var(--color-brand)", color: "var(--color-surface-void)" }}
                    disabled
                  >
                    Disabled
                  </button>
                  <button
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{ background: "var(--color-brand)", color: "var(--color-surface-void)" }}
                  >
                    <span className="flex items-center gap-2">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z" />
                      </svg>
                      Add Slot
                    </span>
                  </button>
                  <button
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{ background: "var(--color-brand)", color: "var(--color-surface-void)" }}
                  >
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Secondary / Outline */}
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  Secondary & Ghost
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border-medium)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    View Details
                  </button>
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--color-brand-border)",
                      color: "var(--color-brand)",
                    }}
                  >
                    Manage
                  </button>
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Destructive */}
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  Destructive & Warning
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{
                      background: "var(--color-error-subtle)",
                      border: "1px solid var(--color-error-border)",
                      color: "var(--color-error)",
                    }}
                  >
                    Cancel Booking
                  </button>
                  <button
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={{
                      background: "var(--color-warning-subtle)",
                      border: "1px solid var(--color-warning-border)",
                      color: "var(--color-warning)",
                    }}
                  >
                    Flag for Review
                  </button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  Sizes
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { label: "xs", px: "px-3 py-1.5", text: "text-xs" },
                    { label: "sm", px: "px-4 py-2",   text: "text-sm" },
                    { label: "md", px: "px-5 py-2.5", text: "text-sm" },
                    { label: "lg", px: "px-6 py-3",   text: "text-base" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      className={`rounded-lg ${s.px} ${s.text} font-semibold`}
                      style={{ background: "var(--color-brand)", color: "var(--color-surface-void)" }}
                    >
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════ BADGES ═══════ */}
        <Section id="badges" label="08 — Badges">
          <div
            className="rounded-2xl p-8"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
          >
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Confirmed",        bg: "var(--color-success-subtle)",   border: "var(--color-success-border)",   text: "var(--color-success)" },
                { label: "Pending",          bg: "var(--color-warning-subtle)",   border: "var(--color-warning-border)",   text: "var(--color-warning)" },
                { label: "Cancelled",        bg: "var(--color-error-subtle)",     border: "var(--color-error-border)",     text: "var(--color-error)" },
                { label: "Unresolved",       bg: "rgba(106,136,160,0.1)",         border: "rgba(106,136,160,0.22)",         text: "var(--color-text-secondary)" },
                { label: "Settled",          bg: "var(--color-success-subtle)",   border: "var(--color-success-border)",   text: "var(--color-success)" },
                { label: "Refunded",         bg: "var(--color-info-subtle)",      border: "var(--color-brand-border)",     text: "var(--color-brand)" },
                { label: "Voided",           bg: "var(--color-error-subtle)",     border: "var(--color-error-border)",     text: "var(--color-error)" },
                { label: "Deposit Held",     bg: "var(--color-warning-subtle)",   border: "var(--color-warning-border)",   text: "var(--color-warning)" },
                { label: "Attention",        bg: "rgba(244,88,120,0.08)",         border: "rgba(244,88,120,0.24)",         text: "var(--color-error)" },
                { label: "New",              bg: "var(--color-brand-subtle)",     border: "var(--color-brand-border)",     text: "var(--color-brand)" },
              ].map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{
                    background: b.bg,
                    border: `1px solid ${b.border}`,
                    color: b.text,
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ TIER SYSTEM ═══════ */}
        <Section id="tier-system" label="09 — Tier System">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              {
                tier: "top",
                label: "Top Tier",
                score: "≥ 80",
                voidRule: "0 voids in 90 days",
                color: "#20d090",
                bg: "rgba(32,208,144,0.08)",
                border: "rgba(32,208,144,0.28)",
                glow: "rgba(32,208,144,0.12)",
                desc: "Priority slot recovery. Reduced deposit. VIP treatment.",
                metrics: ["Settled: 18", "Voided: 0", "Score: 94"],
              },
              {
                tier: "neutral",
                label: "Neutral Tier",
                score: "40–79",
                voidRule: "< 2 voids in 90 days",
                color: "#6a88a0",
                bg: "rgba(106,136,160,0.08)",
                border: "rgba(106,136,160,0.22)",
                glow: "transparent",
                desc: "Standard booking flow. Default deposit amount.",
                metrics: ["Settled: 5", "Voided: 1", "Score: 62"],
              },
              {
                tier: "risk",
                label: "Risk Tier",
                score: "< 40",
                voidRule: "≥ 2 voids in 90 days",
                color: "#f45878",
                bg: "rgba(244,88,120,0.08)",
                border: "rgba(244,88,120,0.28)",
                glow: "rgba(244,88,120,0.1)",
                desc: "Higher deposit. Last priority in slot recovery.",
                metrics: ["Settled: 2", "Voided: 3", "Score: 28"],
              },
            ].map((t) => (
              <div
                key={t.tier}
                className="rounded-2xl p-6 transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  background: t.bg,
                  border: `1px solid ${t.border}`,
                  boxShadow: `0 0 20px ${t.glow}`,
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider"
                    style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                    {t.label}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: t.color }}
                  >
                    Score {t.score}
                  </span>
                </div>

                <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {t.desc}
                </p>

                <div
                  className="mb-4 rounded-lg p-3 text-xs"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <p className="mb-1 font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                    Qualifier
                  </p>
                  <p style={{ color: t.color }}>{t.voidRule}</p>
                </div>

                <div className="flex gap-2">
                  {t.metrics.map((m) => (
                    <span
                      key={m}
                      className="flex-1 rounded-md px-2 py-1.5 text-center font-mono text-[0.6rem]"
                      style={{ background: "rgba(0,0,0,0.25)", color: "var(--color-text-tertiary)" }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════ STATUS ═══════ */}
        <Section id="status" label="10 — Status System">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Confirmed",
                icon: "✓",
                color: "var(--color-success)",
                bg: "var(--color-success-subtle)",
                border: "var(--color-success-border)",
                desc: "Manually confirmed by shop owner",
              },
              {
                label: "Pending",
                icon: "◐",
                color: "var(--color-warning)",
                bg: "var(--color-warning-subtle)",
                border: "var(--color-warning-border)",
                desc: "Awaiting confirmation",
              },
              {
                label: "Needs Attention",
                icon: "⚠",
                color: "var(--color-error)",
                bg: "var(--color-error-subtle)",
                border: "var(--color-error-border)",
                desc: "High-risk or action required",
              },
              {
                label: "No Status",
                icon: "—",
                color: "var(--color-text-tertiary)",
                bg: "var(--color-surface-elevated)",
                border: "var(--color-border-default)",
                desc: "Default unset state",
              },
              {
                label: "Settled",
                icon: "£",
                color: "var(--color-success)",
                bg: "var(--color-success-subtle)",
                border: "var(--color-success-border)",
                desc: "Financial outcome resolved, paid",
              },
              {
                label: "Refunded",
                icon: "↩",
                color: "var(--color-brand)",
                bg: "var(--color-brand-subtle)",
                border: "var(--color-brand-border)",
                desc: "Full refund issued to customer",
              },
              {
                label: "Voided",
                icon: "✕",
                color: "var(--color-error)",
                bg: "var(--color-error-subtle)",
                border: "var(--color-error-border)",
                desc: "No-show, deposit retained",
              },
              {
                label: "Unresolved",
                icon: "?",
                color: "var(--color-text-secondary)",
                bg: "rgba(106,136,160,0.08)",
                border: "rgba(106,136,160,0.18)",
                desc: "Outcome not yet determined",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-4"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: s.border, color: s.color }}
                  >
                    {s.icon}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: s.color }}>
                    {s.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════ CARDS ═══════ */}
        <Section id="cards" label="11 — Dashboard Cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Upcoming",
                value: "24",
                delta: "+3 today",
                deltaPositive: true,
                icon: "📅",
                accent: "var(--color-brand)",
              },
              {
                label: "High-Risk Bookings",
                value: "3",
                delta: "Needs review",
                deltaPositive: false,
                icon: "⚠️",
                accent: "var(--color-error)",
              },
              {
                label: "Deposits at Risk",
                value: "£240",
                delta: "2 appointments",
                deltaPositive: null,
                icon: "💰",
                accent: "var(--color-warning)",
              },
              {
                label: "Monthly Revenue",
                value: "£1,840",
                delta: "+12% vs last month",
                deltaPositive: true,
                icon: "📈",
                accent: "var(--color-success)",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl p-5 transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {card.label}
                  </span>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p
                  className="mb-2 text-3xl font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: card.accent,
                  }}
                >
                  {card.value}
                </p>
                <p
                  className="text-xs"
                  style={{
                    color:
                      card.deltaPositive === true
                        ? "var(--color-success)"
                        : card.deltaPositive === false
                        ? "var(--color-error)"
                        : "var(--color-text-tertiary)",
                  }}
                >
                  {card.delta}
                </p>
                {/* mini accent bar */}
                <div
                  className="mt-4 h-0.5 w-full rounded-full"
                  style={{ background: "var(--color-border-subtle)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: "60%", background: card.accent, opacity: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════ FORMS ═══════ */}
        <Section id="forms" label="12 — Forms">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div
              className="rounded-2xl p-8"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
            >
              <h3
                className="mb-6 text-lg font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
              >
                Input States
              </h3>
              <div className="space-y-4">
                {/* Default */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Default
                  </label>
                  <input
                    readOnly
                    defaultValue=""
                    placeholder="Customer phone number"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm placeholder:text-[var(--color-text-tertiary)] outline-none"
                    style={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-border-default)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                {/* Focused */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Focused
                  </label>
                  <input
                    readOnly
                    defaultValue="+44 7700 900123"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                    style={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-brand)",
                      color: "var(--color-text-primary)",
                      boxShadow: "0 0 0 3px var(--color-brand-glow)",
                    }}
                  />
                </div>
                {/* Error */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Error
                  </label>
                  <input
                    readOnly
                    defaultValue="not-a-phone"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                    style={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-error)",
                      color: "var(--color-text-primary)",
                      boxShadow: "0 0 0 3px var(--color-error-subtle)",
                    }}
                  />
                  <p className="mt-1.5 text-xs" style={{ color: "var(--color-error)" }}>
                    Invalid phone number format
                  </p>
                </div>
                {/* Success */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Success
                  </label>
                  <input
                    readOnly
                    defaultValue="+44 7700 900456"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                    style={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-success)",
                      color: "var(--color-text-primary)",
                      boxShadow: "0 0 0 3px var(--color-success-subtle)",
                    }}
                  />
                  <p className="mt-1.5 text-xs" style={{ color: "var(--color-success)" }}>
                    Mobile number verified
                  </p>
                </div>
                {/* Disabled */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
                    Disabled
                  </label>
                  <input
                    readOnly
                    defaultValue="Read only field"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none cursor-not-allowed opacity-50"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border-subtle)",
                      color: "var(--color-text-tertiary)",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl p-8"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
            >
              <h3
                className="mb-6 text-lg font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
              >
                Sample Booking Form
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      First Name
                    </label>
                    <input
                      readOnly
                      defaultValue="Sarah"
                      className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                      style={{
                        background: "var(--color-surface-overlay)",
                        border: "1px solid var(--color-border-default)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      Last Name
                    </label>
                    <input
                      readOnly
                      defaultValue="Mitchell"
                      className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                      style={{
                        background: "var(--color-surface-overlay)",
                        border: "1px solid var(--color-border-default)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Phone Number
                  </label>
                  <input
                    readOnly
                    defaultValue="+44 7700 900789"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono outline-none"
                    style={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-brand)",
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-mono)",
                      boxShadow: "0 0 0 3px var(--color-brand-glow)",
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Service
                  </label>
                  <div
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                    style={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-border-default)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Hair Colour &amp; Cut — 90 min
                  </div>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--color-surface-overlay)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      Deposit required
                    </span>
                    <span
                      className="font-mono text-lg font-semibold"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--color-brand)" }}
                    >
                      £35.00
                    </span>
                  </div>
                  <p className="mt-1 text-[0.65rem]" style={{ color: "var(--color-text-tertiary)" }}>
                    Refundable if cancelled 48h+ before appointment
                  </p>
                </div>
                <button
                  className="w-full rounded-lg py-3 text-sm font-semibold transition-all duration-150"
                  style={{
                    background: "var(--color-brand)",
                    color: "var(--color-surface-void)",
                  }}
                >
                  Confirm &amp; Pay Deposit
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════ DATA TABLE ═══════ */}
        <Section id="data-table" label="Bonus — Data Table Pattern">
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--color-border-default)" }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: "var(--color-surface-raised)", borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Upcoming Appointments
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wider"
                  style={{ background: "var(--color-brand-subtle)", border: "1px solid var(--color-brand-border)", color: "var(--color-brand)" }}
                >
                  3 attention
                </span>
              </div>
            </div>
            <div style={{ background: "var(--color-surface-raised)" }}>
              {/* Header row */}
              <div
                className="grid grid-cols-5 px-6 py-3 text-[0.65rem] font-semibold uppercase tracking-widest"
                style={{ borderBottom: "1px solid var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}
              >
                <span>Customer</span>
                <span>Date / Time</span>
                <span>Service</span>
                <span>Tier</span>
                <span>Status</span>
              </div>
              {/* Data rows */}
              {[
                {
                  name: "Sarah Mitchell",
                  phone: "+44 7700 900789",
                  date: "Mon 24 Mar",
                  time: "10:00",
                  service: "Hair Colour",
                  tier: "top",
                  status: "Confirmed",
                  statusColor: "var(--color-success)",
                  statusBg: "var(--color-success-subtle)",
                  statusBorder: "var(--color-success-border)",
                  tierColor: "#20d090",
                  tierBg: "rgba(32,208,144,0.1)",
                  tierBorder: "rgba(32,208,144,0.3)",
                },
                {
                  name: "James O'Brien",
                  phone: "+44 7700 900456",
                  date: "Tue 25 Mar",
                  time: "14:30",
                  service: "Balayage",
                  tier: "neutral",
                  status: "Pending",
                  statusColor: "var(--color-warning)",
                  statusBg: "var(--color-warning-subtle)",
                  statusBorder: "var(--color-warning-border)",
                  tierColor: "#6a88a0",
                  tierBg: "rgba(106,136,160,0.1)",
                  tierBorder: "rgba(106,136,160,0.22)",
                },
                {
                  name: "Priya Sharma",
                  phone: "+44 7700 900321",
                  date: "Wed 26 Mar",
                  time: "11:00",
                  service: "Cut & Style",
                  tier: "risk",
                  status: "Needs Attention",
                  statusColor: "var(--color-error)",
                  statusBg: "var(--color-error-subtle)",
                  statusBorder: "var(--color-error-border)",
                  tierColor: "#f45878",
                  tierBg: "rgba(244,88,120,0.1)",
                  tierBorder: "rgba(244,88,120,0.3)",
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 items-center px-6 py-4 transition-colors duration-100"
                  style={{
                    borderBottom: i < 2 ? "1px solid var(--color-border-hairline)" : "none",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {row.name}
                    </p>
                    <p className="font-mono text-[0.65rem]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {row.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>{row.date}</p>
                    <p className="font-mono text-[0.65rem]" style={{ color: "var(--color-text-tertiary)" }}>{row.time}</p>
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{row.service}</p>
                  <span
                    className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider"
                    style={{ background: row.tierBg, border: `1px solid ${row.tierBorder}`, color: row.tierColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.tierColor }} />
                    {row.tier}
                  </span>
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider"
                    style={{ background: row.statusBg, border: `1px solid ${row.statusBorder}`, color: row.statusColor }}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ TOKEN INDEX ═══════ */}
        <Section id="token-index" label="Appendix — Token Index">
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--color-border-default)" }}
          >
            <div
              className="px-6 py-4"
              style={{ background: "var(--color-surface-raised)", borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                All design tokens available as CSS custom properties. Import via{" "}
                <code
                  className="rounded px-1.5 py-0.5 text-[0.7rem]"
                  style={{ background: "var(--color-surface-elevated)", fontFamily: "var(--font-mono)", color: "var(--color-brand)" }}
                >
                  globals.css
                </code>
              </p>
            </div>
            <div
              className="grid grid-cols-1 divide-y sm:grid-cols-2"
              style={{ background: "var(--color-surface-raised)" }}
            >
              {[
                { category: "Surfaces",   tokens: ["--color-surface-void", "--color-surface-base", "--color-surface-raised", "--color-surface-overlay", "--color-surface-elevated", "--color-surface-float"] },
                { category: "Text",       tokens: ["--color-text-primary", "--color-text-secondary", "--color-text-tertiary", "--color-text-inverse"] },
                { category: "Brand",      tokens: ["--color-brand", "--color-brand-hover", "--color-brand-dim", "--color-brand-subtle", "--color-brand-border", "--color-brand-glow"] },
                { category: "Status",     tokens: ["--color-success", "--color-success-subtle", "--color-warning", "--color-warning-subtle", "--color-error", "--color-error-subtle"] },
                { category: "Tier",       tokens: ["--color-tier-top", "--color-tier-top-bg", "--color-tier-neutral", "--color-tier-neutral-bg", "--color-tier-risk", "--color-tier-risk-bg"] },
                { category: "Borders",    tokens: ["--color-border-hairline", "--color-border-subtle", "--color-border-default", "--color-border-medium", "--color-border-strong"] },
                { category: "Shadows",    tokens: ["--shadow-xs", "--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-xl", "--shadow-brand"] },
                { category: "Animation",  tokens: ["--duration-instant", "--duration-fast", "--duration-normal", "--duration-slow", "--ease-spring", "--ease-smooth", "--ease-in-out"] },
                { category: "Typography", tokens: ["--font-display", "--font-body", "--font-mono"] },
                { category: "Radius",     tokens: ["--radius-sm", "--radius-md", "--radius-lg", "--radius-xl", "--radius-2xl", "--radius-3xl", "--radius-full"] },
              ].map(({ category, tokens }) => (
                <div
                  key={category}
                  className="p-5"
                  style={{ borderBottom: "1px solid var(--color-border-hairline)" }}
                >
                  <p
                    className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {category}
                  </p>
                  <div className="space-y-1">
                    {tokens.map((t) => (
                      <code
                        key={t}
                        className="block text-[0.7rem]"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--color-brand)" }}
                      >
                        {t}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

      </div>

      {/* ── Footer ── */}
      <footer
        className="mt-12 px-6 py-12 text-center"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <p
          className="font-display text-2xl italic"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text-tertiary)" }}
        >
          Astro Design System — Deep Ledger v2.0
        </p>
        <p className="mt-2 font-mono text-[0.65rem]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
          Every booking. Every payment. Every tier. Designed with precision.
        </p>
      </footer>
    </div>
  );
}
