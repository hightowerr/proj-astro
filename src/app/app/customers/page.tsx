import Link from "next/link";
import { ReliabilityStats } from "@/components/customers/reliability-stats";
import { TierBadge } from "@/components/customers/tier-badge";
import { listCustomersForShop } from "@/lib/queries/customers";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function CustomersPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Create your shop to start managing customers.</p>
      </div>
    );
  }

  const customers = await listCustomersForShop(shop.id);
  const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

  return (
    <div className="container mx-auto space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Reliability scores and tier assignments for {shop.name}.
        </p>
      </header>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No customers yet. Share your booking link to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Customer</th>
                <th scope="col" className="px-4 py-2 font-medium">Contact</th>
                <th scope="col" className="px-4 py-2 font-medium">Tier</th>
                <th scope="col" className="px-4 py-2 font-medium">Score</th>
                <th scope="col" className="px-4 py-2 font-medium">Reliability</th>
                <th scope="col" className="px-4 py-2 font-medium">Last Updated</th>
                <th scope="col" className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{customer.fullName}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.email || customer.phone}</td>
                  <td className="px-4 py-3">
                    <TierBadge tier={customer.tier} />
                  </td>
                  <td className="px-4 py-3">
                    {customer.score !== null ? (
                      <span className="font-medium tabular-nums">{customer.score}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ReliabilityStats stats={customer.stats} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.computedAt ? dateFormatter.format(customer.computedAt) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/customers/${customer.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="rounded-lg border bg-muted/50 p-4">
        <h2 className="mb-2 text-sm font-medium">Understanding Tiers</h2>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-green-800">Top tier:</span> Highly reliable customers
            (score &gt;= 80 and no voids in 90 days).
          </p>
          <p>
            <span className="font-medium">Neutral tier:</span> Default tier for customers with
            moderate history.
          </p>
          <p>
            <span className="font-medium text-red-800">Risk tier:</span> Lower reliability (score &lt;
            40 or two or more voids in 90 days).
          </p>
          <p className="pt-1">Scores are recomputed nightly using booking outcomes from the last 180 days.</p>
        </div>
      </section>
    </div>
  );
}
