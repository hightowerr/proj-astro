"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TierPolicyFormProps = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    riskDepositAmountCents: number | null;
    topDepositWaived: boolean;
    topDepositAmountCents: number | null;
    excludeRiskFromOffers: boolean;
    baseDepositAmountCents: number | null;
  };
};

export function TierPolicyForm({ action, initial }: TierPolicyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topDepositWaived, setTopDepositWaived] = useState(initial.topDepositWaived);

  const baseDepositHint =
    initial.baseDepositAmountCents === null
      ? "base policy amount is not set"
      : `${initial.baseDepositAmountCents} cents`;

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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl rounded-lg border p-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Risk tier</h3>
        <p className="text-xs text-muted-foreground">
          Applies to customers with low payment reliability (score &lt;40 or multiple voids in 90
          days).
        </p>

        <div className="space-y-2">
          <Label htmlFor="riskDepositAmountCents">Risk tier deposit amount (cents)</Label>
          <Input
            id="riskDepositAmountCents"
            name="riskDepositAmountCents"
            type="number"
            min="1"
            step="1"
            defaultValue={initial.riskDepositAmountCents ?? ""}
            placeholder={baseDepositHint}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the base policy amount ({baseDepositHint}).
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium">Top tier</h3>
        <p className="text-xs text-muted-foreground">
          Applies to highly reliable customers (score &ge;80 with no recent voids).
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="topDepositWaived"
              checked={topDepositWaived}
              onChange={(event) => setTopDepositWaived(event.target.checked)}
              className="h-4 w-4"
            />
            <span className="font-medium">Waive deposit for top tier customers</span>
          </label>
          <p className="text-xs text-muted-foreground">
            When enabled, top tier customers can book without a deposit.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topDepositAmountCents">Top tier deposit amount (cents)</Label>
          <Input
            id="topDepositAmountCents"
            name="topDepositAmountCents"
            type="number"
            min="1"
            step="1"
            defaultValue={initial.topDepositAmountCents ?? ""}
            placeholder={baseDepositHint}
            disabled={topDepositWaived}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the base policy amount. Ignored when waived is enabled.
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium">Slot recovery offers</h3>
        <p className="text-xs text-muted-foreground">
          Control whether risk tier customers receive offer SMS messages.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="excludeRiskFromOffers"
              defaultChecked={initial.excludeRiskFromOffers}
              className="h-4 w-4"
            />
            <span className="font-medium">Exclude risk tier from slot recovery offers</span>
          </label>
          <p className="text-xs text-muted-foreground">
            When disabled, risk tier customers are still eligible and prioritized last.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save tier settings"}
      </Button>
    </form>
  );
}
