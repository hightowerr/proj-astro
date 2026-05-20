# Email/SMS Template Management — Slices

**Shape:** A — Inline sections on the reminders page
**Status:** Sliced, ready to plan

---

## Slice Definitions

### V1 — Email template editor

Everything needed to view, edit, preview, and save the email reminder template.

**Affordances in this slice:**

| ID | Affordance | Type |
|----|------------|------|
| N1 | `ReminderSettingsPage` extended to load email template via `getOrCreateTemplate` | Non-UI |
| N2 | `getOrCreateTemplate("appointment_reminder_24h", "email", 1, defaults)` | Non-UI |
| N9 | `message_templates` table (read + write) | Non-UI |
| N5 | `updateEmailTemplate(subject, body)` server action — queries max version, inserts at `maxVersion + 1`, `revalidatePath` | Non-UI |
| N4 | `renderTemplateClient(body, sampleData)` — inlined pure fn in `EmailTemplateForm` | Non-UI |
| U2 | Email section card below `ReminderTimingsForm` | UI |
| U3 | Subject `<input>` | UI |
| U4 | Body `<textarea>` (HTML) | UI |
| U5 | Variable pills — `{{customerName}}`, `{{shopName}}`, `{{appointmentDate}}`, `{{appointmentTime}}`, `{{bookingUrl}}` | UI |
| U6 | Preview panel — live-rendered HTML with sample data | UI |
| U7 | Save button — `useTransition`, dirty-check guard, "Saved" feedback | UI |

**Wiring (this slice only):**
```
N1 (page load) → N2 → N9 → initial values passed to EmailTemplateForm
U3 / U4 (type) → N4 → U6 (preview re-renders)
U7 (save) → N5 → N9 (INSERT new version row)
```

**Demo:** Owner opens `/app/settings/reminders`, scrolls below timing section, sees email template with subject and body pre-loaded. Edits subject line, preview updates instantly. Clicks Save — next cron job picks up the new template.

---

### V2 — SMS template editor

Everything needed to view, edit, preview, and save the SMS reminder template. Includes char/segment counter.

**Affordances in this slice:**

| ID | Affordance | Type |
|----|------------|------|
| N3 | `getOrCreateTemplate("appointment_reminder_24h", "sms", 1, defaults)` | Non-UI |
| N6 | `updateSmsTemplate(body)` server action — same version-insert mechanism as N5 | Non-UI |
| N4 | `renderTemplateClient` inlined in `SmsTemplateForm` | Non-UI |
| U9 | SMS section card below email section | UI |
| U10 | Body `<textarea>` (plain text) | UI |
| U11 | Variable pills — `{{shop_name}}`, `{{time}}`, `{{manage_link}}` | UI |
| U12 | Char/segment counter — `"142 chars · 1 SMS segment"` (segments = `Math.ceil(chars / 160)`) | UI |
| U13 | Preview panel — rendered plain text | UI |
| U14 | Save button — same pattern as U7 | UI |

**Wiring (this slice only):**
```
N1 (page load, extended) → N3 → N9 → initial body passed to SmsTemplateForm
U10 (type) → N4 → U13 (preview), U12 (counter)
U14 (save) → N6 → N9 (INSERT new version row)
```

**Demo:** Owner scrolls further, sees SMS template. Edits body — char counter ticks up in real time, preview shows rendered text with `{{shop_name}}` replaced by the real shop name. Clicks Save.

---

### V3 — Reset to defaults

Adds reset-to-default to both forms. Safety net if an owner corrupts a template.

**Affordances in this slice:**

| ID | Affordance | Type |
|----|------------|------|
| N7 | `resetEmailTemplate()` server action — inserts code-default subject + body at `maxVersion + 1` | Non-UI |
| N8 | `resetSmsTemplate()` server action — inserts code-default body at `maxVersion + 1` | Non-UI |
| U8 | "Reset to default" link on `EmailTemplateForm` — confirmation dialog before action | UI |
| U15 | "Reset to default" link on `SmsTemplateForm` — same pattern | UI |

**Wiring (this slice only):**
```
U8 (confirm reset) → N7 → N9 (INSERT default at maxVersion+1)
U15 (confirm reset) → N8 → N9 (INSERT default at maxVersion+1)
```

**Demo:** Owner accidentally deletes `{{bookingUrl}}` from the email body, saves. Opens reset dialog, confirms. Template reverts to factory default. Next send uses the restored template.

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: EMAIL TEMPLATE EDITOR"]
        subgraph remindersPage1["Reminders Page (server)"]
            N1["N1: ReminderSettingsPage"]
            N2["N2: getOrCreateTemplate (email)"]
        end
        subgraph emailForm["EmailTemplateForm (client)"]
            U2["U2: Email section card"]
            U3["U3: Subject input"]
            U4["U4: Body textarea"]
            U5["U5: Variable pills"]
            U6["U6: Preview panel"]
            U7["U7: Save button"]
            N4e["N4: renderTemplateClient"]
            N5["N5: updateEmailTemplate"]
        end
    end

    subgraph slice2["V2: SMS TEMPLATE EDITOR"]
        subgraph remindersPage2["Reminders Page (server, extended)"]
            N3["N3: getOrCreateTemplate (sms)"]
        end
        subgraph smsForm["SmsTemplateForm (client)"]
            U9["U9: SMS section card"]
            U10["U10: Body textarea"]
            U11["U11: Variable pills"]
            U12["U12: Char counter"]
            U13["U13: Preview panel"]
            U14["U14: Save button"]
            N4s["N4: renderTemplateClient"]
            N6["N6: updateSmsTemplate"]
        end
    end

    subgraph slice3["V3: RESET TO DEFAULTS"]
        U8["U8: Reset email (+ confirm)"]
        U15["U15: Reset SMS (+ confirm)"]
        N7["N7: resetEmailTemplate"]
        N8["N8: resetSmsTemplate"]
    end

    subgraph db["Database"]
        N9["N9: message_templates table"]
    end

    %% V1 wiring
    N1 --> N2 --> N9
    N9 -.->|email template| N2
    N2 -.->|initialSubject, initialBody| U2
    U3 -->|type| N4e
    U4 -->|type| N4e
    N4e -.->|rendered HTML| U6
    U7 --> N5 --> N9

    %% V2 wiring
    N1 --> N3 --> N9
    N9 -.->|sms template| N3
    N3 -.->|initialBody| U9
    U10 -->|type| N4s
    N4s -.->|rendered text| U13
    N4s -.->|char count| U12
    U14 --> N6 --> N9

    %% V3 wiring
    U8 --> N7 --> N9
    U15 --> N8 --> N9

    %% Slice ordering (invisible)
    slice1 ~~~ slice2
    slice2 ~~~ slice3

    %% Slice colours
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px

    %% Nested subgraph transparent
    style remindersPage1 fill:transparent,stroke:#888,stroke-width:1px
    style remindersPage2 fill:transparent,stroke:#888,stroke-width:1px
    style emailForm fill:transparent,stroke:#888,stroke-width:1px
    style smsForm fill:transparent,stroke:#888,stroke-width:1px

    %% Node styling
    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12,U13,U14,U15 ui
    class N1,N2,N3,N4e,N4s,N5,N6,N7,N8,N9 nonui
```

**Legend:**
- **Pink nodes (U)** = UI affordances
- **Grey nodes (N)** = Code affordances
- **Solid lines** = Wires Out
- **Dashed lines** = Returns To

---

## Slices Grid

|  |  |  |
|:--|:--|:--|
| **V1: EMAIL TEMPLATE EDITOR**<br>✅ COMPLETE<br><br>• Extend reminders page to load email template<br>• `EmailTemplateForm`: subject + body textarea<br>• Variable pills + live HTML preview<br>• `updateEmailTemplate` server action (new version insert)<br><br>*Demo: Edit subject, preview updates live, save — cron picks up new template* | **V2: SMS TEMPLATE EDITOR**<br>✅ COMPLETE<br><br>• Extend page load to fetch SMS template<br>• `SmsTemplateForm`: textarea + char/segment counter<br>• Variable pills + live plain-text preview<br>• `updateSmsTemplate` server action<br><br>*Demo: Edit SMS body, counter ticks, preview shows rendered text, save* | **V3: RESET TO DEFAULTS**<br>✅ COMPLETE<br><br>• Reset button + inline confirmation on both forms<br>• `resetEmailTemplate` + `resetSmsTemplate` actions<br>• Inserts code default at maxVersion + 1<br>• &nbsp;<br><br>*Demo: Corrupt a template, hit reset, factory default restored* |
