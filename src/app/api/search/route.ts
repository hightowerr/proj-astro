import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchCustomers } from "@/lib/queries/search";
import { getShopByOwnerId } from "@/lib/queries/shops";
import type { SearchResponse } from "@/types/search";

const MAX_QUERY_LENGTH = 80;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shop = await getShopByOwnerId(session.user.id);
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const nonSpaceLen = q.replace(/\s/g, "").length;
  if (nonSpaceLen < 2) {
    return NextResponse.json({
      query: q,
      customers: [],
      appointments: [],
    } satisfies SearchResponse);
  }

  const customerResults = await searchCustomers(shop.id, q);

  return NextResponse.json({
    query: q,
    customers: customerResults,
    appointments: [],
  } satisfies SearchResponse);
}
