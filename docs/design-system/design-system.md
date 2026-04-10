# Atelier Light Design System — Tokens

> Source: Stitch · `assets/449beb1e286a415881985419132b73bd` · v1
> Project: Reminder System PRD (`projects/18022274387003063612`)

---

## Theme Metadata

| Property | Value |
|----------|-------|
| Display name | Atelier Light |
| Color mode | Light |
| Color variant | Fidelity |
| Custom / seed color | `#003366` |
| Override primary | `#003366` |
| Override secondary | `#E8C4B8` |
| Override tertiary | `#F4A58A` |
| Override neutral | `#F9F9F7` |
| Roundness | `ROUND_EIGHT` (8px) |
| Spacing scale | 3 (generous) |
| Headline font | Manrope |
| Body font | Manrope |
| Label font | Manrope |

---

## CSS Custom Properties

Paste this block into your global stylesheet (e.g. `src/app/globals.css`) inside a `:root` or `@theme inline` block.

```css
:root {
  /* ─── Primary ─────────────────────────────────────────── */
  --al-primary:                   #001e40;
  --al-primary-container:         #003366;
  --al-primary-fixed:             #d5e3ff;
  --al-primary-fixed-dim:         #a7c8ff;
  --al-on-primary:                #ffffff;
  --al-on-primary-container:      #799dd6;
  --al-on-primary-fixed:          #001b3c;
  --al-on-primary-fixed-variant:  #1f477b;
  --al-inverse-primary:           #a7c8ff;

  /* ─── Secondary (Warm Terracotta) ─────────────────────── */
  --al-secondary:                     #74584f;
  --al-secondary-container:           #fdd8cb;
  --al-secondary-fixed:               #ffdbcf;
  --al-secondary-fixed-dim:           #e2bfb3;
  --al-on-secondary:                  #ffffff;
  --al-on-secondary-container:        #785c53;
  --al-on-secondary-fixed:            #2a170f;
  --al-on-secondary-fixed-variant:    #5a4138;

  /* ─── Tertiary (Deep Sienna) ───────────────────────────── */
  --al-tertiary:                      #3b1002;
  --al-tertiary-container:            #572411;
  --al-tertiary-fixed:                #ffdbcf;
  --al-tertiary-fixed-dim:            #ffb59c;
  --al-on-tertiary:                   #ffffff;
  --al-on-tertiary-container:         #d38970;
  --al-on-tertiary-fixed:             #380d01;
  --al-on-tertiary-fixed-variant:     #6f3723;

  /* ─── Surface Hierarchy ────────────────────────────────── */
  --al-background:                    #f9f9f7;
  --al-surface:                       #f9f9f7;
  --al-surface-bright:                #f9f9f7;
  --al-surface-dim:                   #dadad8;
  --al-surface-tint:                  #3a5f94;
  --al-surface-variant:               #e2e3e1;
  --al-surface-container-lowest:      #ffffff;
  --al-surface-container-low:         #f4f4f2;
  --al-surface-container:             #eeeeec;
  --al-surface-container-high:        #e8e8e6;
  --al-surface-container-highest:     #e2e3e1;
  --al-inverse-surface:               #2f3130;

  /* ─── On-Surface / Text ────────────────────────────────── */
  --al-on-background:                 #1a1c1b;
  --al-on-surface:                    #1a1c1b;
  --al-on-surface-variant:            #43474f;
  --al-inverse-on-surface:            #f1f1ef;

  /* ─── Outline / Border ─────────────────────────────────── */
  --al-outline:                       #737780;
  --al-outline-variant:               #c3c6d1;

  /* ─── Error ─────────────────────────────────────────────── */
  --al-error:                         #ba1a1a;
  --al-error-container:               #ffdad6;
  --al-on-error:                      #ffffff;
  --al-on-error-container:            #93000a;

  /* ─── Derived / Convenience ────────────────────────────── */
  /* Ghost border: --al-outline-variant at 20% opacity       */
  --al-ghost-border: rgba(195, 198, 209, 0.20);

  /* Ambient shadow for floating elements                     */
  --al-shadow-float: 0px 20px 40px rgba(26, 28, 27, 0.06);

  /* CTA gradient                                             */
  --al-gradient-primary: linear-gradient(135deg, #001e40, #003366);

  /* ─── Typography ─────────────────────────────────────────  */
  --al-font-headline: 'Manrope', sans-serif;
  --al-font-body:     'Manrope', sans-serif;
  --al-font-label:    'Manrope', sans-serif;

  /* ─── Roundness ──────────────────────────────────────────  */
  --al-radius-sm:   4px;
  --al-radius-md:   6px;
  --al-radius-lg:   8px;   /* base unit */
  --al-radius-xl:   12px;
  --al-radius-2xl:  16px;
  --al-radius-full: 9999px;
}
```

---

## Token Quick-Reference

### Surface stack (light → elevated)

```
--al-surface-container-lowest   #ffffff    Cards / natural lift
--al-surface-container-low      #f4f4f2    Section backgrounds
--al-surface-container          #eeeeec    Grouping containers
--al-surface-container-high     #e8e8e6    Input focus bg
--al-surface-container-highest  #e2e3e1    Interactive zones
--al-surface / --al-background  #f9f9f7    App canvas
--al-surface-dim                #dadad8    Dimmed / scrim
```

### Text hierarchy

```
--al-primary              #001e40   Headlines & titles
--al-on-surface           #1a1c1b   Body text
--al-on-surface-variant   #43474f   Secondary / label copy
--al-outline              #737780   Placeholder, disabled
```

### Key rules encoded as tokens

| Token | Purpose |
|-------|---------|
| `--al-ghost-border` | Accessibility-only border — outline-variant @ 20% opacity |
| `--al-shadow-float` | Floating elements (dropdowns, modals) — never pure black shadow |
| `--al-gradient-primary` | CTA gradient — adds depth to primary buttons/heroes |

---

## Tailwind v4 Integration

Add to your `@theme inline` block in `globals.css`:

```css
@theme inline {
  --color-al-primary:                  var(--al-primary);
  --color-al-primary-container:        var(--al-primary-container);
  --color-al-secondary:                var(--al-secondary);
  --color-al-secondary-container:      var(--al-secondary-container);
  --color-al-tertiary:                 var(--al-tertiary);
  --color-al-surface:                  var(--al-surface);
  --color-al-surface-low:              var(--al-surface-container-low);
  --color-al-surface-container:        var(--al-surface-container);
  --color-al-surface-high:             var(--al-surface-container-high);
  --color-al-surface-highest:          var(--al-surface-container-highest);
  --color-al-surface-lowest:           var(--al-surface-container-lowest);
  --color-al-on-surface:               var(--al-on-surface);
  --color-al-on-surface-variant:       var(--al-on-surface-variant);
  --color-al-outline:                  var(--al-outline);
  --color-al-outline-variant:          var(--al-outline-variant);
  --color-al-error:                    var(--al-error);
  --color-al-error-container:          var(--al-error-container);
  --font-al:                           var(--al-font-body);
  --radius-al:                         var(--al-radius-lg);
}
```

Usage in components:

```tsx
<div className="bg-al-surface-lowest rounded-al text-al-on-surface">
  <h2 className="text-al-primary font-[family-name:var(--al-font-headline)]">
    Section Title
  </h2>
  <p className="text-al-on-surface-variant">
    Body copy in warm gray, never pure black.
  </p>
</div>
```
