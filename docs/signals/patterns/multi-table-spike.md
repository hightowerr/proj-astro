# Pattern: Multi-Table Spike

- **Pattern name**: Multi-table spike (verify column ownership)
- **Problem it solves**: Specs reference a column (e.g., `stripePaymentIntentId`) on one table, but the column lives on a related table. Implementation discovers this at coding time, causing drift.
- **Solution**: During spike phase, for every column referenced in a spec's query, verify: (1) which table owns it, (2) the join path from the handler's context to that table. Run `grep -n "columnName" schema.ts` as a minimum check.
- **First used in**: inflight-payments spec 07 (sweep cancel). Spec said "query appointments.stripePaymentIntentId" but column is on `payments` table.
- **Reusable?** YES — any feature that queries across the appointments/payments/shops boundary should verify column ownership in the spike.
