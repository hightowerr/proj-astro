# Bet 1 — Slices

**Shape:** A (Fix in place)  
**Breadboard source:** `shaping.md` → Detail A

---

## Slices

### V1: Currency-Aware Deposits

**Scope:** End-to-end fix for the deposits-at-risk card — from query through type through component.

| ID | Affordance | Change |
|----|-----------|--------|
| N2 | `dashboardAppointmentSelect` | Add `depositCurrency: payments.currency` |
| N3 | `getDashboardData()` accumulator | Replace scalar sum with `Record<string, number>` per-currency loop |
| N4 | `getDepositsAtRisk()` | Group by `payments.currency`; return `Record<string, number>` |
| N5 | `DashboardAppointment` type | Add `depositAmount: number`, `depositCurrency: string \| null` |
| N6 | `DashboardData.depositsAtRisk` | Type change: `number` → `Record<string, number>` |
| N7 | `formatCurrency(amountCents, currency)` | Add `currency` param; remove hardcoded `"USD"` |
| N8 | Deposit renderer | Branch on `Object.keys(depositsAtRisk).length`; call N7 or return `"Multiple currencies"` |
| U1 | Deposits at Risk card value | Renders output of N8 |

**Files touched:** `dashboard.ts`, `types/dashboard.ts`, `summary-cards.tsx`

**Demo:** Deposits at Risk card shows the correct currency symbol (not always USD) for a single-currency shop. A multi-currency shop sees `"Multiple currencies"` instead of a blended total.

**Verify with sufficient conditions:**
- [ ] Single-currency shop: card shows correct currency symbol
- [ ] Multi-currency shop: card shows `"Multiple currencies"`
- [ ] `formatCurrency` no longer hardcodes `"USD"`
- [ ] `DashboardData.depositsAtRisk` TypeScript type is `Record<string, number>` — compiler rejects `number` assignments

---

### V2: Type Drift — customerId + serviceName

**Scope:** Make `baseAppointmentSelect` match the existing `DashboardAppointment` type declaration. No type file changes — the type is already correct; the select is behind.

| ID | Affordance | Change |
|----|-----------|--------|
| N1 | `baseAppointmentSelect` | Add `customerId: appointments.customerId`; add `serviceName: eventTypes.name`; add `.leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))` to `getHighRiskAppointments`, `getAllUpcomingAppointments`, `getDashboardData` |

**Files touched:** `dashboard.ts` only

**Demo:** `pnpm typecheck` passes with 0 errors. `appointment.customerId` and `appointment.serviceName` are non-undefined in runtime rows.

**Verify with sufficient conditions:**
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `getDashboardData()`, `getHighRiskAppointments()`, `getAllUpcomingAppointments()` all return rows with populated `customerId`
- [ ] Rows where `eventTypeId` is set have non-null `serviceName`; rows without have `null`

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice2["V2: TYPE DRIFT FIX"]
        subgraph queryLayer2["Query Layer — dashboard.ts"]
            N1["N1: baseAppointmentSelect\n+ customerId, serviceName\n+ eventTypes leftJoin × 3"]
        end
    end

    subgraph slice1["V1: CURRENCY-AWARE DEPOSITS"]
        subgraph queryLayer1["Query Layer — dashboard.ts"]
            N2["N2: dashboardAppointmentSelect\n+ depositCurrency"]
            N3["N3: getDashboardData()\nper-currency accumulator"]
            N4["N4: getDepositsAtRisk()\ncurrency-grouped query"]
        end
        subgraph typeLayer["Type Layer — types/dashboard.ts"]
            N5["N5: DashboardAppointment\n+ depositAmount, depositCurrency"]
            N6["N6: DashboardData\n.depositsAtRisk: Record&lt;string, number&gt;"]
        end
        subgraph summaryCards["Summary Cards — summary-cards.tsx"]
            N7["N7: formatCurrency\n(amountCents, currency)"]
            N8["N8: deposit renderer\nbranches on key count"]
            U1["U1: Deposits at Risk\ncard value"]
        end
    end

    %% Force V1 before V2 in layout
    slice1 ~~~ slice2

    %% Wiring
    N1 --> N2
    N2 --> N3
    N3 --> N6
    N4 --> N6
    N5 -.->|row type| N3
    N6 -->|"page.tsx passes as prop"| N8
    N8 --> N7
    N7 --> U1
    N8 --> U1

    %% Slice colours
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px

    %% Nested subgraphs transparent
    style queryLayer1 fill:transparent,stroke:#888,stroke-width:1px
    style queryLayer2 fill:transparent,stroke:#888,stroke-width:1px
    style typeLayer fill:transparent,stroke:#888,stroke-width:1px
    style summaryCards fill:transparent,stroke:#888,stroke-width:1px

    %% Node styles
    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1 ui
    class N1,N2,N3,N4,N5,N6,N7,N8 nonui
```

**Legend:**
- **Green** = V1: Currency-Aware Deposits
- **Blue** = V2: Type Drift Fix
- **Pink nodes** = UI affordances
- **Grey nodes** = Code affordances

---

## Slices Grid

|  |  |
|:--|:--|
| **V1: CURRENCY-AWARE DEPOSITS**<br>⏳ PENDING<br><br>• `dashboardAppointmentSelect` + `depositCurrency`<br>• `getDashboardData()` per-currency accumulator<br>• `getDepositsAtRisk()` grouped query<br>• `formatCurrency` + deposit renderer<br><br>*Demo: Deposits card shows correct currency; multi-currency → "Multiple currencies"* | **V2: TYPE DRIFT FIX**<br>⏳ PENDING<br><br>• `baseAppointmentSelect` + `customerId` + `serviceName`<br>• `eventTypes` left join added to 3 query fns<br>• `pnpm typecheck` exits 0<br>• • &nbsp;<br><br>*Demo: `pnpm typecheck` passes clean; customerId + serviceName populated in rows* |

---

## Sequencing Note

V1 first — it fixes the user-visible bug and validates the type-cascade path (`dashboard.ts` → `types/dashboard.ts` → `page.tsx` → `summary-cards.tsx`) before V2 touches the same query file.

V2 is the unblocking step for downstream bets: `customerId` unlocks Bet 2, `serviceName` unlocks Bet 3. Ship V2 before starting either.
