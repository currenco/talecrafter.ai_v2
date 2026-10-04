'use client'

import { createAuthClient } from '@neondatabase/auth/next'

export const authClient = createAuthClient()

const TOKEN_EXPIRY_SKEW_MS = 30_000
const TOKEN_FALLBACK_TTL_MS = 60_000

let cachedToken: { value: string; expiresAt: number } | null = null
let tokenRequest: Promise<string> | null = null

const getTokenExpiry = (token: string) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return Date.now() + TOKEN_FALLBACK_TTL_MS

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    )
    const decoded = JSON.parse(globalThis.atob(padded)) as { exp?: number }
    return decoded.exp ? decoded.exp * 1000 : Date.now() + TOKEN_FALLBACK_TTL_MS
  } catch {
    return Date.now() + TOKEN_FALLBACK_TTL_MS
  }
}

export const clearAccessTokenCache = () => {
  cachedToken = null
  tokenRequest = null
}

export const getAccessToken = async () => {
  if (
    cachedToken &&
    cachedToken.expiresAt - Date.now() > TOKEN_EXPIRY_SKEW_MS
  ) {
    return cachedToken.value
  }

  if (tokenRequest) return tokenRequest

  tokenRequest = (async () => {
    const result = await authClient.token({
      fetchOptions: {
        // Fetch once when the cached JWT is absent or near expiry.
        headers: { 'X-Force-Fetch': 'true' },
      },
    })
    if (result.error) {
      throw new Error(result.error.message ?? 'Unable to create access token')
    }

    const token = result.data?.token
    if (!token) {
      throw new Error('Neon Auth returned no access token')
    }

    cachedToken = { value: token, expiresAt: getTokenExpiry(token) }
    return token
  })()

  try {
    return await tokenRequest
  } finally {
    tokenRequest = null
  }
}

export const useUser = () => {
  const session = authClient.useSession()
  return {
    isLoaded: !session.isPending,
    isSignedIn: Boolean(session.data?.user),
    user: session.data?.user ?? null,
  }
}
