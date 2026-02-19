import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createShop, getShopByOwnerId } from "@/lib/queries/shops";

const normalizeSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
};

export default async function AppHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const shop = await getShopByOwnerId(session.user.id);

  const createShopAction = async (formData: FormData) => {
    "use server";

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      redirect("/login");
    }

    const name = String(formData.get("name") ?? "").trim();
    const rawSlug = String(formData.get("slug") ?? "");
    const slug = normalizeSlug(rawSlug);

    if (!name || !slug) {
      throw new Error("Shop name and slug are required");
    }

    await createShop({
      ownerUserId: session.user.id,
      name,
      slug,
    });

    revalidatePath("/app");
    redirect("/app");
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Shop setup</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to start accepting bookings.
        </p>
      </div>

      {shop ? (
        <div className="rounded-lg border p-6 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Shop name</p>
            <p className="text-lg font-medium">{shop.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Shop URL slug</p>
            <p className="text-base font-medium">{shop.slug}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Booking link</p>
            <Link
              href={`/book/${shop.slug}`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              /book/{shop.slug}
            </Link>
          </div>
        </div>
      ) : (
        <form action={createShopAction} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <label htmlFor="shop-name" className="text-sm font-medium">
              Shop name
            </label>
            <input
              id="shop-name"
              name="name"
              type="text"
              autoComplete="organization"
              required
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="shop-slug" className="text-sm font-medium">
              Shop URL slug
            </label>
            <input
              id="shop-slug"
              name="slug"
              type="text"
              autoComplete="off"
              required
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create shop
          </button>
        </form>
      )}
    </div>
  );
}
