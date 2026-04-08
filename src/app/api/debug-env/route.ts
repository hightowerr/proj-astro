export async function GET() {
  return Response.json({
    STRIPE_MOCKED: process.env.STRIPE_MOCKED,
    PLAYWRIGHT: process.env.PLAYWRIGHT,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_PLAYWRIGHT_STRIPE_BYPASS: process.env.NEXT_PUBLIC_PLAYWRIGHT_STRIPE_BYPASS,
  });
}
