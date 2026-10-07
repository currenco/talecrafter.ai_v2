'use client'

import { createAuthClient } from '@neondatabase/auth/next'

export const authClient = createAuthClient()

const TOKEN_EXPIRY_SKEW_MS = 30_000
const TOKEN_FALLBACK_TTL_MS = 60_000
const TOKEN_RETRY_DELAYS_MS = [150, 350] as const
const FORCE_FETCH_OPTIONS = {
  fetchOptions: { headers: { 'X-Force-Fetch': 'true' } },
} as const

let cachedToken: { value: string; expiresAt: number } | null = null
let tokenRequest: Promise<string> | null = null
let refreshRequest: Promise<string> | null = null
let sessionExpiryRequest: Promise<void> | null = null
let tokenGeneration = 0

export class AuthSessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.')
    this.name = 'AuthSessionExpiredError'
  }
}

export class AuthTokenUnavailableError extends Error {
  constructor(message = 'Unable to create an access token. Please try again.') {
    super(message)
    this.name = 'AuthTokenUnavailableError'
  }
}

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

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined
  if ('status' in error && typeof error.status === 'number') return error.status
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }
  return undefined
}

export const clearAccessTokenCache = () => {
  tokenGeneration += 1
  cachedToken = null
  tokenRequest = null
  refreshRequest = null
}

const redirectToSignIn = () => {
  if (typeof window === 'undefined') return

  const currentPath = `${window.location.pathname}${window.location.search}`
  const search = new URLSearchParams({ reason: 'session-expired' })
  if (!window.location.pathname.startsWith('/sign-in')) {
    search.set('redirect', currentPath)
  }
  window.location.replace(`/sign-in?${search.toString()}`)
}

export const expireAuthSession = () => {
  if (sessionExpiryRequest) return sessionExpiryRequest

  clearAccessTokenCache()
  sessionExpiryRequest = (async () => {
    try {
      await authClient.signOut()
    } catch {
      // The remote session may already be gone; local state still needs clearing.
    } finally {
      redirectToSignIn()
    }
  })()

  return sessionExpiryRequest
}

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, delayMs))

const getAuthoritativeSessionState = async () => {
  try {
    const result = await authClient.getSession(FORCE_FETCH_OPTIONS)
    if (result.error) {
      return result.error.status === 401 ? 'expired' : 'unknown'
    }
    return result.data?.user ? 'active' : 'expired'
  } catch (error) {
    return getErrorStatus(error) === 401 ? 'expired' : 'unknown'
  }
}

const throwTokenFailure = async (message?: string): Promise<never> => {
  const sessionState = await getAuthoritativeSessionState()
  if (sessionState === 'expired') {
    await expireAuthSession()
    throw new AuthSessionExpiredError()
  }

  throw new AuthTokenUnavailableError(message)
}

const requestAccessToken = async (forceRefresh: boolean) => {
  const generation = tokenGeneration
  let failureMessage: string | undefined

  for (let attempt = 0; attempt <= TOKEN_RETRY_DELAYS_MS.length; attempt += 1) {
    let result: Awaited<ReturnType<typeof authClient.token>>
    try {
      result = await authClient.token(
        forceRefresh || attempt > 0 ? FORCE_FETCH_OPTIONS : undefined,
      )
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        return throwTokenFailure('Unable to refresh the access token.')
      }
      throw error instanceof Error
        ? error
        : new AuthTokenUnavailableError()
    }

    if (result.error) {
      failureMessage =
        result.error.message ?? 'Unable to create an access token.'
      if (result.error.status === 401) {
        return throwTokenFailure(failureMessage)
      }
    } else {
      const token = result.data?.token
      if (token) {
        if (generation === tokenGeneration) {
          cachedToken = { value: token, expiresAt: getTokenExpiry(token) }
        }
        return token
      }
    }

    const retryDelay = TOKEN_RETRY_DELAYS_MS[attempt]
    if (retryDelay !== undefined) await wait(retryDelay)
  }

  return throwTokenFailure(failureMessage)
}

export const getAccessToken = async () => {
  if (refreshRequest) return refreshRequest

  if (cachedToken) {
    if (cachedToken.expiresAt - Date.now() > TOKEN_EXPIRY_SKEW_MS) {
      return cachedToken.value
    }
    return refreshAccessToken()
  }

  if (tokenRequest) return tokenRequest

  const request = requestAccessToken(false)
  tokenRequest = request

  try {
    return await request
  } finally {
    if (tokenRequest === request) tokenRequest = null
  }
}

export const refreshAccessToken = () => {
  if (refreshRequest) return refreshRequest

  clearAccessTokenCache()
  const request = requestAccessToken(true)
  refreshRequest = request

  const clearRefreshRequest = () => {
    if (refreshRequest === request) refreshRequest = null
  }
  void request.then(clearRefreshRequest, clearRefreshRequest)
  return request
}

export const useUser = () => {
  const session = authClient.useSession()
  return {
    isLoaded: !session.isPending,
    isSignedIn: Boolean(session.data?.user),
    user: session.data?.user ?? null,
  }
}
