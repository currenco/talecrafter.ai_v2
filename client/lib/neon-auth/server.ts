import { createNeonAuth } from '@neondatabase/auth/next/server'

const requiredEnvironment = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for Neon Auth`)
  return value
}

let auth: ReturnType<typeof createNeonAuth> | undefined

export const getAuth = () => {
  auth ??= createNeonAuth({
    baseUrl: requiredEnvironment('NEON_AUTH_BASE_URL'),
    cookies: {
      secret: requiredEnvironment('NEON_AUTH_COOKIE_SECRET'),
    },
  })

  return auth
}
