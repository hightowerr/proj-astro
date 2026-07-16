// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StripeConnectCard } from "./stripe-connect-card";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

const connected = {
  initialStatus: "complete" as const,
  stripeAccountId: "acct_test_123",
};

describe("ConnectedView payouts status", () => {
  it("shows green 'Payouts enabled' when payoutsEnabled=true", () => {
    render(<StripeConnectCard {...connected} payoutsEnabled={true} />);
    // Row label + status value both say "Payouts enabled"
    expect(screen.getAllByText("Payouts enabled")).toHaveLength(2);
    expect(screen.queryByText("Payouts verifying")).not.toBeInTheDocument();
    expect(screen.queryByText(/verifying your payout/)).not.toBeInTheDocument();
  });

  it("shows 'Payouts verifying' + info box when payoutsEnabled=false", () => {
    render(<StripeConnectCard {...connected} payoutsEnabled={false} />);
    expect(screen.getByText("Payouts verifying")).toBeInTheDocument();
    const infoText = screen.getByText(/verifying your payout details/);
    expect(infoText).toBeInTheDocument();
    expect(infoText.closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite"
    );
  });

  it("defaults to payoutsEnabled=true when prop omitted", () => {
    render(<StripeConnectCard {...connected} />);
    expect(screen.getAllByText("Payouts enabled")).toHaveLength(2);
    expect(screen.queryByText("Payouts verifying")).not.toBeInTheDocument();
    expect(screen.queryByText(/verifying your payout/)).not.toBeInTheDocument();
  });

  it("does not change the Charges enabled row", () => {
    render(<StripeConnectCard {...connected} payoutsEnabled={false} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
