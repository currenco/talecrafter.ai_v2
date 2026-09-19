import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/neon-auth/server'

const protectedPrefixes = [
  '/admin',
  '/buy-credits',
  '/create-story',
  '/dashboard',
  '/interactive-story',
]

const isProtectedPath = (pathname: string) =>
  protectedPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

export default function proxy(request: NextRequest) {
  const hasSessionVerifier = request.nextUrl.searchParams.has(
    'neon_auth_session_verifier'
  )

  if (isProtectedPath(request.nextUrl.pathname) || hasSessionVerifier) {
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const loginUrl = hasSessionVerifier
      ? '/sign-in'
      : `/sign-in?redirect=${encodeURIComponent(requestedPath)}`

    return getAuth().middleware({ loginUrl })(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
