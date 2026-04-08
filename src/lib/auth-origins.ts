const toOrigin = (value: string | undefined) => {
  if (!value) {
    return undefined
  }

  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

const toVercelOrigin = (value: string | undefined) => {
  if (!value) {
    return undefined
  }

  return toOrigin(`https://${value}`)
}

export function getTrustedAuthOrigins(
  env: NodeJS.ProcessEnv = process.env,
) {
  const origins = [
    toOrigin(env.NEXT_PUBLIC_APP_URL),
    env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined,
    toVercelOrigin(env.VERCEL_URL),
    toVercelOrigin(env.VERCEL_BRANCH_URL),
    toVercelOrigin(env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter((origin): origin is string => Boolean(origin))

  return origins.length > 0 ? Array.from(new Set(origins)) : undefined
}
