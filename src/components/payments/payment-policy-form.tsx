"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentPolicyFormProps = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    currency: string;
    paymentMode: "deposit" | "full_prepay" | "none";
    depositAmountCents: number;
  };
};

export function PaymentPolicyForm({ action, initial }: PaymentPolicyFormProps) {
  const [paymentMode, setPaymentMode] = useState(initial.paymentMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      await action(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          name="currency"
          defaultValue={initial.currency}
          placeholder="USD"
          maxLength={3}
          required
        />
        <p className="text-xs text-muted-foreground">
          3-letter currency code (e.g., USD, GBP, EUR)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Payment mode</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMode"
              value="deposit"
              checked={paymentMode === "deposit"}
              onChange={(e) => setPaymentMode(e.target.value as "deposit")}
              className="h-4 w-4"
            />
            <span className="text-sm">Deposit required</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMode"
              value="full_prepay"
              checked={paymentMode === "full_prepay"}
              onChange={(e) => setPaymentMode(e.target.value as "full_prepay")}
              className="h-4 w-4"
            />
            <span className="text-sm">Full prepayment required</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMode"
              value="none"
              checked={paymentMode === "none"}
              onChange={(e) => setPaymentMode(e.target.value as "none")}
              className="h-4 w-4"
            />
            <span className="text-sm">No payment required</span>
          </label>
        </div>
      </div>

      {paymentMode !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="depositAmount">
            {paymentMode === "deposit" ? "Deposit amount" : "Full payment amount"}
          </Label>
          <Input
            id="depositAmount"
            name="depositAmount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={(initial.depositAmountCents / 100).toFixed(2)}
            placeholder="20.00"
            required
          />
          <p className="text-xs text-muted-foreground">
            Amount in {initial.currency} (e.g., 20.00 for $20)
          </p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save policy"}
      </Button>
    </form>
  );
}
