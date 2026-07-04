# Slice 7a: Unit Tests — `transfer.reversed` Handler

**Spec**: 16
**File(s)**: `src/app/api/stripe/connect-webhook/route.test.ts`
**Dependencies**: Spec 15 (handler exists)

## What to do

### 1. Add test block
Add a new `describe("transfer.reversed", ...)` block in `route.test.ts`. Follow the exact pattern of the existing `transfer.created` describe block (lines 158-235).

### Test cases (3)

#### Test 1: "logs error with context on reversal"
```typescript
it("logs error with context on reversal", async () => {
  const transfer = makeTransfer();
  const event = makeEvent("transfer.reversed", "evt_tr_1", transfer);

  mockConstructEvent.mockReturnValue(event);
  mockReturning.mockResolvedValue([{ id: "evt_tr_1" }]);
  mockResolveTransferContext.mockResolvedValue({
    appointmentId: "apt_1",
    shopId: "shop_1",
    shopName: "Cool Cuts",
    paymentId: "pay_1",
    connectedAccountId: "acct_connected_1",
    amountCents: 7500,
  });

  const res = await POST(buildRequest());

  expect(res.status).toBe(200);
  expect(errorSpy).toHaveBeenCalledWith(
    "Transfer reversed — MANUAL_REVIEW_REQUIRED",
    expect.objectContaining({
      transferId: "tr_test_1",
      amount: 7500,
      action: "MANUAL_REVIEW_REQUIRED",
      appointmentId: "apt_1",
    })
  );
});
```

#### Test 2: "logs error when context unresolvable"
```typescript
it("logs error when context unresolvable", async () => {
  // mockResolveTransferContext returns null
  // Expect console.error with "Transfer reversed but could not resolve appointment context"
  // and action: "MANUAL_REVIEW_REQUIRED"
});
```

#### Test 3: "skips processing on duplicate event (dedup)"
```typescript
it("skips processing on duplicate event (dedup)", async () => {
  // mockReturning returns empty array (already processed)
  // Expect no console.error, no resolveTransferContext call
});
```

### 2. Reuse existing helpers
All existing helpers (`makeTransfer`, `makeEvent`, `buildRequest`) work as-is — no modifications needed.

### 3. Verify
- `pnpm vitest run src/app/api/stripe/connect-webhook/route.test.ts` — all tests pass

## Acceptance criteria
- [ ] 3 tests added in `describe("transfer.reversed", ...)` block
- [ ] Test 1: verifies `console.error` with `MANUAL_REVIEW_REQUIRED` and full context
- [ ] Test 2: verifies `console.error` when context is null
- [ ] Test 3: verifies dedup skips processing
- [ ] All existing tests still pass
- [ ] `pnpm check` passes
