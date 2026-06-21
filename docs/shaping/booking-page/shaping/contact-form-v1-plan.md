# V1: Contact Form Restyle

**Shape:** [Contact Form Reskin](./contact-form-shape.md), Shape A
**Status:** Complete
**Spec:** `06-contact-form.html`

---

## Goal

Restyle the 3 contact fields in `booking-form.tsx` from shadcn components to inline-styled native elements matching the Atelier Light spec. Add focus ring CSS class. Retrofix date picker focus ring.

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/app/globals.css` | Modify | Add `.al-input-wrap:focus-within` CSS rule |
| `src/components/booking/booking-form.tsx` | Modify | Restyle contact fields section (~lines 1217-1254), add `className` to date picker wrapper |

## Implementation Details

### 1. Focus ring CSS rule (`globals.css`)

Add this rule after the existing input/focus styles (near the end of the file, or near existing `.al-*` rules):

```css
.al-input-wrap:focus-within {
  border-color: var(--al-primary) !important;
  box-shadow: 0 0 0 3px rgba(0, 30, 64, 0.12);
}
```

### 2. Date picker retrofix (`booking-form.tsx` ~line 1128)

Find the date picker's wrapper div:
```tsx
<div style={{
  background: 'var(--al-surface-container-lowest)',
  border: '1px solid rgba(195,198,209,0.50)',
  borderRadius: '12px',
  ...
}}>
```

Add `className="al-input-wrap"`:
```tsx
<div
  className="al-input-wrap"
  style={{
    background: 'var(--al-surface-container-lowest)',
    border: '1px solid rgba(195,198,209,0.50)',
    borderRadius: '12px',
    ...
  }}>
```

### 3. Contact fields restyle (`booking-form.tsx` ~lines 1217-1254)

**Current code:**
```tsx
<div className="space-y-4">
  <div className="space-y-2.5">
    <Label htmlFor="full-name" className="text-sm font-semibold">Full name</Label>
    <Input id="full-name" name="fullName" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
  </div>
  <div className="space-y-2.5">
    <Label htmlFor="phone" className="text-sm font-semibold">Phone</Label>
    <Input id="phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
  </div>
  <div className="space-y-2.5">
    <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
    <Input id="email" name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} required />
  </div>
</div>
```

**Replacement:**
```tsx
<div>
  {/* Full name — full width */}
  <div style={{ marginBottom: '20px' }}>
    <label htmlFor="full-name" style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
      marginBottom: '8px',
    }}>
      Full name
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--al-primary)', display: 'inline-block' }} />
    </label>
    <div className="al-input-wrap" style={{
      background: 'var(--al-surface-container-lowest)',
      border: '1px solid rgba(195,198,209,0.50)',
      borderRadius: '12px',
      padding: '14px 16px',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    }}>
      <input
        id="full-name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Jordan Carter"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        required
        style={{
          fontFamily: 'var(--font-manrope-raw), sans-serif',
          fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
          border: 'none', outline: 'none', background: 'transparent', width: '100%',
        }}
      />
    </div>
  </div>

  {/* Phone + Email — 2 column grid */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
    <div>
      <label htmlFor="phone" style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
        marginBottom: '8px',
      }}>
        Phone
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--al-primary)', display: 'inline-block' }} />
      </label>
      <div className="al-input-wrap" style={{
        background: 'var(--al-surface-container-lowest)',
        border: '1px solid rgba(195,198,209,0.50)',
        borderRadius: '12px',
        padding: '14px 16px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+44 7700 900123"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          style={{
            fontFamily: 'var(--font-manrope-raw), sans-serif',
            fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
            border: 'none', outline: 'none', background: 'transparent', width: '100%',
          }}
        />
      </div>
    </div>
    <div>
      <label htmlFor="email" style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
        marginBottom: '8px',
      }}>
        Email
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--al-primary)', display: 'inline-block' }} />
      </label>
      <div className="al-input-wrap" style={{
        background: 'var(--al-surface-container-lowest)',
        border: '1px solid rgba(195,198,209,0.50)',
        borderRadius: '12px',
        padding: '14px 16px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{
            fontFamily: 'var(--font-manrope-raw), sans-serif',
            fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
            border: 'none', outline: 'none', background: 'transparent', width: '100%',
          }}
        />
      </div>
    </div>
  </div>
</div>
```

### Key changes summarized

| Element | Before | After |
|---------|--------|-------|
| Wrapper | `<div className="space-y-4">` | `<div>` with explicit margin/grid |
| Labels | shadcn `<Label className="text-sm font-semibold">` | Native `<label>` 13px/800/navy + required dot |
| Inputs | shadcn `<Input>` | Native `<input>` inside `.al-input-wrap` div |
| Layout | 3 stacked fields | Full-name full-width + phone/email 2-col grid |
| Focus | None | `.al-input-wrap:focus-within` CSS class |
| Placeholders | None | "Jordan Carter", "+44 7700 900123", "you@email.com" |
| Font | Inherited (shadcn default) | Manrope 16px/700/navy explicitly |

### Placeholder values

The spec shows example placeholders. These are design-only hints — not real user data. Values used:
- Full name: "Jordan Carter"
- Phone: "+44 7700 900123"  
- Email: "you@email.com"

---

## Self-testing

1. **Visual check — field layout:** Navigate to `/book/kicksnare`. Confirm:
   - Full name field is full-width with 13px/800 navy label + required dot
   - Phone and email side-by-side in 2-column grid with 16px gap
   - All input wraps: white bg, gray border, 12px radius
   - 20px margin between full-name group and the phone/email row

2. **Visual check — input text:** Type in each field. Confirm:
   - Text renders in 16px/700 navy (Manrope)
   - Placeholder text is 16px/400 muted (#737780)

3. **Focus ring — contact fields:** Click into each field. Confirm:
   - Border turns navy
   - Shadow ring `0 0 0 3px rgba(0,30,64,0.12)` appears
   - Ring disappears when clicking outside

4. **Focus ring — date picker retrofix:** Click into the date field. Confirm:
   - Same navy border + shadow ring appears (was missing before)

5. **Token audit:** Inspect all contact field elements. Confirm:
   - Zero `--color-*` tokens
   - No shadcn class names in the contact section

6. **Form submission:** Fill all fields, select a slot, click "Confirm booking". Confirm:
   - `fullName`, `phone`, `email` values are sent correctly to the API
   - No console errors

7. **TypeScript check:**
   ```bash
   pnpm tsc --noEmit 2>&1 | head -20
   ```
