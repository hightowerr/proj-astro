# Spike — Utility Section Insertion Point

**Spec:** #04 (AL Utility Classes)  
**Date:** 2026-06-20  
**Question:** Where exactly should new utility classes be appended?

---

## Findings

### Atelier Light Utilities Section

- **Start:** Line 605 (section comment header)
- **End:** Line 723 (last rule of `.al-toggle-thumb`)
- **Blank line:** Line 724 (end of file)

### Last Existing Class

`.al-toggle-track[data-checked="true"] .al-toggle-thumb` ending at line 723:
```css
.al-toggle-track[data-checked="true"] .al-toggle-thumb {
  transform: translateX(1.25rem);
}
```

### What Comes After

**Nothing.** Line 724 is a blank line and the file ends there. No additional comment blocks, `@layer` directives, or other CSS rules follow.

### Recommended Insertion Point

**Append new utility classes at line 724.** This is completely safe:
- No downstream content to conflict with
- Stays within the Atelier Light Utilities section (logically)
- Maintains the existing section organization
