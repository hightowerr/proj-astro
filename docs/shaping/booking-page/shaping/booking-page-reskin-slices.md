# Booking Page Reskin — Slices

**Selected shape:** C (Booking layout + restyle inline)
**Source:** [Shaping document](./booking-page-reskin-shape.md)

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: BOOKING LAYOUT + NAV"]
        subgraph bookLayout["Booking Layout"]
            subgraph bookingNav["BookingNav"]
                U1["U1: brand mark"]
                U2["U2: brand name"]
                U3["U3: nav links"]
                U4["U4: sign in"]
                U5["U5: CTA button"]
                U6["U6: hairline"]
            end
        end
        N0["N0: RouteChrome exclusion"]
    end

    subgraph slice2["V2: PAGE HEADER + SERVICE CARD"]
        N6["N6: server data"]
        U7["U7: eyebrow"]
        U8["U8: heading"]
        U9["U9: subtitle"]
        subgraph serviceCard["Service Card"]
            U10["U10: card container"]
            U11["U11: service eyebrow"]
            U12["U12: service name"]
            U13["U13: service meta"]
            U14["U14: selected badge"]
        end
    end

    subgraph slice3["V3: DATE PICKER + COMM PREFS"]
        subgraph datePicker["Date Picker"]
            U15["U15: date label + dot"]
            U16["U16: input wrap"]
            U17["U17: date input"]
            U18["U18: calendar icon"]
            N1["N1: date state"]
        end
        subgraph commPrefs["Comm Prefs"]
            U19["U19: SMS checkbox"]
            U20["U20: SMS label"]
            U21["U21: email card"]
            U22["U22: email checkbox"]
            U23["U23: email title"]
            U24["U24: email desc"]
            N2["N2: smsOptIn"]
            N3["N3: emailOptIn"]
        end
        N4["N4: availability fetch"]
        N5["N5: form submission"]
    end

    %% Force slice ordering
    slice1 ~~~ slice2
    slice2 ~~~ slice3

    %% Cross-slice wiring
    N6 --> U8
    N6 --> U9
    U17 --> N1
    N1 --> N4
    U19 --> N2
    U22 --> N3
    N0 -.->|excludes /book| bookLayout

    %% Slice styling
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px

    style bookLayout fill:transparent,stroke:#888,stroke-width:1px
    style bookingNav fill:transparent,stroke:#888,stroke-width:1px
    style serviceCard fill:transparent,stroke:#888,stroke-width:1px
    style datePicker fill:transparent,stroke:#888,stroke-width:1px
    style commPrefs fill:transparent,stroke:#888,stroke-width:1px

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12,U13,U14,U15,U16,U17,U18,U19,U20,U21,U22,U23,U24 ui
    class N0,N1,N2,N3,N4,N5,N6 nonui
```

---

## Slices Grid

|  |  |  |
|:--|:--|:--|
| **[V1: BOOKING LAYOUT + NAV](./v1-plan.md)**<br>✅ COMPLETE<br><br>• Add `/book` to RouteChrome exclusions<br>• Create `src/app/book/layout.tsx`<br>• Create `BookingNav` server component<br>• Brand mark + name + links + CTA<br><br>*Demo: Visit `/book/[slug]` — AL-styled nav, scrolls with page, no fixed header* | **[V2: PAGE HEADER + SERVICE CARD](./v2-plan.md)**<br>✅ COMPLETE<br><br>• Restyle page header in `page.tsx`<br>• Add eyebrow / heading / subtitle<br>• Restyle service card in `booking-form.tsx`<br>• Add green "Selected" badge pill<br><br>*Demo: Page shows editorial header, service card with green badge* | **[V3: DATE PICKER + COMM PREFS](./v3-plan.md)**<br>✅ COMPLETE<br><br>• Restyle date input with required dot<br>• Custom input wrap + calendar icon<br>• Restyle SMS inline checkbox<br>• Restyle email card checkbox<br><br>*Demo: Date field and checkboxes match Atelier Light spec* |

---

## Slice Dependencies

```
V1 (layout + nav) → V2 (header + service card) → V3 (date + prefs)
```

V1 must land first because the layout change (RouteChrome exclusion + booking layout) sets up the page background (`#f9f9f7`) and removes the old SiteHeader. V2 and V3 restyle components that sit inside this new layout.

V2 before V3 is a soft dependency — both modify `booking-form.tsx` so sequential ordering prevents merge conflicts.
