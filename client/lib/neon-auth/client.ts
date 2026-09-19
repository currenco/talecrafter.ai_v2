'use client'

import { createAuthClient } from '@neondatabase/auth/next'

export const authClient = createAuthClient()

export const getAccessToken = async () => {
  const result = await authClient.token()
  if (result.error) {
    throw new Error(result.error.message ?? 'Unable to create access token')
  }
  return result.data?.token ?? null
}

export const useAuth = () => {
  const session = authClient.useSession()
  return {
    getToken: getAccessToken,
    isLoaded: !session.isPending,
    isSignedIn: Boolean(session.data?.user),
    userId: session.data?.user.id ?? null,
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
