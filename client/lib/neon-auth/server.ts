import { createNeonAuth } from '@neondatabase/auth/next/server'

const requiredEnvironment = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for the Neon Auth proof`)
  return value
}

export const getNeonPocAuth = () =>
  createNeonAuth({
    baseUrl: requiredEnvironment('NEON_AUTH_BASE_URL'),
    cookies: {
      secret: requiredEnvironment('NEON_AUTH_COOKIE_SECRET'),
    },
  })
