const PLACEHOLDER_POSTGRES_URL =
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";

export function requirePostgresUrl(suiteName: string): string {
  const postgresUrl = process.env.POSTGRES_URL?.trim();

  if (!postgresUrl || postgresUrl === PLACEHOLDER_POSTGRES_URL) {
    throw new Error(
      `${suiteName} requires POSTGRES_URL. Vitest now loads .env automatically, so set POSTGRES_URL in your shell or .env before running DB integration tests.`,
    );
  }

  return postgresUrl;
}
