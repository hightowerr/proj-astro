# Email/SMS Template Management — Big Picture

**Selected shape:** A — Inline sections on the reminders page

---

## Frame

### Problem

- Shop owners cannot see what their email and SMS reminders say; templates are seeded from code defaults with no visibility in the app
- There is no way to personalise reminder content — tone, wording, and calls-to-action are all fixed in code
- `/app/settings/reminders` only exposes timing configuration (when to send), not content configuration (what to send)
- Debugging wrong-content reminders requires direct database inspection

### Outcome

- Owners can view and edit email and SMS reminder templates from the reminders settings page
- Template variables (`{{shopName}}`, `{{appointmentTime}}`, etc.) are documented inline so owners cannot accidentally break them
- Live preview with sample data lets owners verify output before saving
- Saved templates are picked up on the next reminder send without disrupting message logs or in-flight dedup

---

## Shape

### Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Owner can view the current email reminder template (subject + body) | Core goal | ✅ |
| R1 | Owner can view the current SMS reminder template body | Core goal | ✅ |
| R2 | Owner can edit and save the email reminder template (subject + body) | Core goal | ✅ |
| R3 | Owner can edit and save the SMS reminder template body | Core goal | ✅ |
| R4 | Available template variables are shown inline so owners do not accidentally remove them | Must-have | ✅ |
| R5 | Owner can preview the rendered template with sample data before saving | Must-have | ✅ |
| R6 | Saved template is used on the next reminder send | Must-have | ✅ |
| R7 | Saves preserve message_log integrity — existing log rows still reference the correct historical template | Must-have | ✅ |
| R8 | Template UI lives within the reminders page — no new nav item | Must-have | ✅ |
| R9 | Owner can send a test email or SMS to verify rendered output | Nice-to-have — defer to V2 | ✅ |

### Parts

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Server component loads both templates via `getOrCreateTemplate` at page load; passes initial values + shop name as props | |
| **A2** | `EmailTemplateForm` client component — subject `<input>` + body `<textarea>`; `useTransition` + server action save; dirty-check guard | |
| **A3** | `SmsTemplateForm` client component — body `<textarea>`; 160-char SMS segment counter; `useTransition` + server action save | |
| **A4** | `updateEmailTemplate` / `updateSmsTemplate` server actions — query max version for key+channel, `INSERT` at `maxVersion + 1`; `revalidatePath` | |
| **A5** | `renderTemplateClient()` — verbatim copy of `renderTemplate` logic inlined in each form; runs on every keystroke; no API call | |
| **A6** | Variable reference pills — read-only `{{token}}` chips with description tooltip; shown beside each editor | |
| **A7** | `resetEmailTemplate` / `resetSmsTemplate` server actions — insert code-default body at `maxVersion + 1` | |

### Breadboard

```mermaid
flowchart TB
    subgraph remindersPage["PLACE: /app/settings/reminders (server)"]
        N1["N1: ReminderSettingsPage"]
        N2["N2: getOrCreateTemplate (email)"]
        N3["N3: getOrCreateTemplate (sms)"]
        U1["U1: ReminderTimingsForm (existing)"]
    end

    subgraph emailForm["PLACE: EmailTemplateForm (client)"]
        U2["U2: Email section card"]
        U3["U3: Subject input"]
        U4["U4: Body textarea (HTML)"]
        U5["U5: Variable pills"]
        U6["U6: Preview panel"]
        U7["U7: Save button"]
        U8["U8: Reset to default"]
        N4e["N4: renderTemplateClient"]
        N5["N5: updateEmailTemplate"]
        N7["N7: resetEmailTemplate"]
    end

    subgraph smsForm["PLACE: SmsTemplateForm (client)"]
        U9["U9: SMS section card"]
        U10["U10: Body textarea (plain text)"]
        U11["U11: Variable pills"]
        U12["U12: Char/segment counter"]
        U13["U13: Preview panel"]
        U14["U14: Save button"]
        U15["U15: Reset to default"]
        N4s["N4: renderTemplateClient"]
        N6["N6: updateSmsTemplate"]
        N8["N8: resetSmsTemplate"]
    end

    subgraph db["PLACE: Database"]
        N9["N9: message_templates table"]
    end

    N1 --> N2 --> N9
    N1 --> N3 --> N9
    N9 -.->|email template| N2
    N9 -.->|sms template| N3
    N2 -.->|initialSubject, initialBody| U2
    N3 -.->|initialBody| U9

    U3 -->|type| N4e
    U4 -->|type| N4e
    N4e -.->|rendered HTML| U6
    U7 --> N5 --> N9
    U8 --> N7 --> N9

    U10 -->|type| N4s
    N4s -.->|rendered text| U13
    N4s -.->|char count| U12
    U14 --> N6 --> N9
    U15 --> N8 --> N9

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12,U13,U14,U15 ui
    class N1,N2,N3,N4e,N4s,N5,N6,N7,N8,N9 nonui
```

**Legend:**
- **Pink nodes (U)** = UI affordances
- **Grey nodes (N)** = Code affordances
- **Solid lines** = Wires Out
- **Dashed lines** = Returns To

---

## Slices

```mermaid
flowchart TB
    subgraph slice1["V1: EMAIL TEMPLATE EDITOR"]
        N1["N1: ReminderSettingsPage (extended)"]
        N2["N2: getOrCreateTemplate (email)"]
        U2["U2: Email section card"]
        U3["U3: Subject input"]
        U4["U4: Body textarea"]
        U5["U5: Variable pills"]
        U6["U6: Preview panel"]
        U7["U7: Save button"]
        N4e["N4: renderTemplateClient"]
        N5["N5: updateEmailTemplate"]
    end

    subgraph slice2["V2: SMS TEMPLATE EDITOR"]
        N3["N3: getOrCreateTemplate (sms)"]
        U9["U9: SMS section card"]
        U10["U10: Body textarea"]
        U11["U11: Variable pills"]
        U12["U12: Char counter"]
        U13["U13: Preview panel"]
        U14["U14: Save button"]
        N4s["N4: renderTemplateClient"]
        N6["N6: updateSmsTemplate"]
    end

    subgraph slice3["V3: RESET TO DEFAULTS"]
        U8["U8: Reset email"]
        U15["U15: Reset SMS"]
        N7["N7: resetEmailTemplate"]
        N8["N8: resetSmsTemplate"]
    end

    subgraph db["Database"]
        N9["N9: message_templates table"]
    end

    N1 --> N2 --> N9
    U3 --> N4e -.-> U6
    U7 --> N5 --> N9
    N1 --> N3 --> N9
    U10 --> N4s -.-> U13
    U10 --> N4s -.-> U12
    U14 --> N6 --> N9
    U8 --> N7 --> N9
    U15 --> N8 --> N9

    slice1 ~~~ slice2
    slice2 ~~~ slice3

    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12,U13,U14,U15 ui
    class N1,N2,N3,N4e,N4s,N5,N6,N7,N8,N9 nonui
```

|  |  |  |
|:--|:--|:--|
| **V1: EMAIL TEMPLATE EDITOR**<br>✅ COMPLETE<br><br>• Extend reminders page to load email template<br>• `EmailTemplateForm`: subject + body textarea<br>• Variable pills + live HTML preview<br>• `updateEmailTemplate` server action (new version insert)<br><br>*Demo: Edit subject, preview updates live, save — cron picks up new template* | **V2: SMS TEMPLATE EDITOR**<br>✅ COMPLETE<br><br>• Extend page load to fetch SMS template<br>• `SmsTemplateForm`: textarea + char/segment counter<br>• Variable pills + live plain-text preview<br>• `updateSmsTemplate` server action<br><br>*Demo: Edit SMS body, counter ticks, preview shows rendered text, save* | **V3: RESET TO DEFAULTS**<br>✅ COMPLETE<br><br>• Reset button + inline confirmation on both forms<br>• `resetEmailTemplate` + `resetSmsTemplate` actions<br>• Inserts code default at maxVersion + 1<br>• &nbsp;<br><br>*Demo: Corrupt a template, hit reset, factory default restored* |
