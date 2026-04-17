# Bet 2 — Slices

**Shape:** A (Set deduplication in getDashboardData)  
**Breadboard source:** `shaping.md` → Detail A

---

## Why one slice

The dependency chain is strictly linear — N1 → N3 → N4 → N5 → UI. Every node requires its predecessor:

- N1 (derivation) must exist before N3 (return) can include the field
- N2 (type) must exist before N3 (return) and N5 (prop) are type-correct
- N3 (return) must exist before N4 (page destructure) compiles
- N4 (page prop) must exist before N5 (component) receives the value
- N5 (component) must exist before U1/U2/U3 render

There is no intermediate cut that produces demo-able UI. Splitting would create a horizontal layer (query + type only, no visible output) — the wrong shape for a slice. The bet appetite is ~0.5 day. One slice is the right structure.

---

## V1: High-Risk Customers KPI

**All affordances ship together.**

| ID | Affordance | Change |
|----|-----------|--------|
| N1 | `highRiskCustomerCount` derivation | Add `new Set(highRiskAppointments.map(a => a.customerId)).size` after the existing loop in `getDashboardData()` |
| N2 | `DashboardData.highRiskCustomerCount` | Add `highRiskCustomerCount: number` to the interface |
| N3 | `getDashboardData()` return | Add `highRiskCustomerCount` to the returned object |
| N4 | Dashboard Page prop | Destructure `highRiskCustomerCount` from `dashboardData`; replace `highRiskCount={highRiskAppointments.length}` with `highRiskCustomerCount={highRiskCustomerCount}` |
| N5 | `SummaryCardsProps` + card JSX | Rename `highRiskCount` → `highRiskCustomerCount`; update label, count, sublabel |
| U1 | Card label | `High-Risk Appointments` → `High-Risk Customers` |
| U2 | Card count | Renders `highRiskCustomerCount` |
| U3 | Card sublabel | Add `In selected window` |

**Files touched:** `types/dashboard.ts`, `dashboard.ts`, `page.tsx`, `summary-cards.tsx`

**Demo:** High-Risk card shows the count of distinct customers (not appointments). A shop with one customer and two high-risk appointments sees `1`, not `2`. Label reads `High-Risk Customers`. Sublabel reads `In selected window`.

**Verify with sufficient conditions:**
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] 1 customer × 3 appointments in window → `highRiskCustomerCount = 1`
- [ ] 1 customer × 1 in-window + 1 out-of-window → `highRiskCustomerCount = 1`
- [ ] Cancelled appointment in window → `highRiskCustomerCount = 0`
- [ ] Risk-tier customer, 0 upcoming bookings → `highRiskCustomerCount = 0`
- [ ] `highRiskAppointments.length` does not appear as the source for the card value
- [ ] Card label reads `High-Risk Customers`
- [ ] Card sublabel reads `In selected window`

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: HIGH-RISK CUSTOMERS KPI"]
        subgraph queryLayer["Query Layer — dashboard.ts"]
            N1["N1: highRiskCustomerCount derivation\nnew Set(...).size"]
            N3["N3: getDashboardData() return\n+ highRiskCustomerCount"]
        end
        subgraph typeLayer["Type Layer — types/dashboard.ts"]
            N2["N2: DashboardData\n.highRiskCustomerCount: number"]
        end
        subgraph dashPage["Dashboard Page — page.tsx"]
            N4["N4: destructure + pass prop"]
        end
        subgraph summaryCards["Summary Cards — summary-cards.tsx"]
            N5["N5: prop rename + card JSX"]
            U1["U1: 'High-Risk Customers'"]
            U2["U2: {highRiskCustomerCount}"]
            U3["U3: 'In selected window'"]
        end
    end

    N1 --> N3
    N2 -.->|type constrains return| N3
    N2 -.->|type constrains prop| N5
    N3 --> N4
    N4 --> N5
    N5 --> U1
    N5 --> U2
    N5 --> U3

    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style queryLayer fill:transparent,stroke:#888,stroke-width:1px
    style typeLayer fill:transparent,stroke:#888,stroke-width:1px
    style dashPage fill:transparent,stroke:#888,stroke-width:1px
    style summaryCards fill:transparent,stroke:#888,stroke-width:1px

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3 ui
    class N1,N2,N3,N4,N5 nonui
```

---

## Slices Grid

|  |
|:--|
| **V1: HIGH-RISK CUSTOMERS KPI**<br>⏳ PENDING<br><br>• `new Set(highRiskAppointments.map(a => a.customerId)).size`<br>• `DashboardData.highRiskCustomerCount: number`<br>• Page props threaded; `highRiskAppointments.length` removed<br>• Card: label + count + sublabel<br><br>*Demo: 1 customer × 2 appointments → card shows 1, not 2* |
