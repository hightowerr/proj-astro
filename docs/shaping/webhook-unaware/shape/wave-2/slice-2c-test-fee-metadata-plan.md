# Slice 2C: Test Application Fee Metadata Storage

## Spec
10-test-application-fee-metadata

## Files
- **Create**: test file (location per project conventions — likely alongside existing appointment/payment tests)

## Implementation

4 test cases targeting the metadata write in `createAppointment()`:

1. **Standard Connect payment** — `amountCents > 50`, Connect complete → `applicationFeeAmountCents: 50`
2. **Fee-waived payment** — `amountCents <= 50`, Connect complete → `applicationFeeAmountCents: 0`
3. **Non-Connect payment** — no connected account → `applicationFeeAmountCents` not present in metadata
4. **Existing metadata preserved** — payment has pre-existing metadata fields → new field merges without overwriting

### Test approach
- If integration test infra exists: call `createAppointment()` with appropriate inputs, read `payments.metadata` from DB
- If unit-only: spy on `db.update().set()` and assert the metadata object passed

## Acceptance criteria
- [ ] All 4 test cases pass
- [ ] Metadata field value correctly reflects post-edge-case fee amount
- [ ] Non-Connect path doesn't add the field
- [ ] lint + type-check pass

## Dependencies
- Spec 04 (slice 1B) — code under test
