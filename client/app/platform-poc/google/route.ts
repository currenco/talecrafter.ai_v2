import { NextResponse } from 'next/server'
import { getNeonPocAuth } from '@/lib/neon-auth/server'

export const GET = async (request: Request) => {
  const origin = new URL(request.url).origin
  const result = await getNeonPocAuth().signIn.social({
    provider: 'google',
    callbackURL: `${origin}/platform-poc/protected`,
    newUserCallbackURL: `${origin}/platform-poc/protected`,
    errorCallbackURL: `${origin}/platform-poc/sign-in`,
  })

  if (result.error || !result.data?.url) {
    return NextResponse.json(
      { error: result.error?.message ?? 'Google sign in could not start' },
      { status: 502 }
    )
  }

  return NextResponse.redirect(result.data.url)
}
