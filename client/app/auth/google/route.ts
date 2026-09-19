import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/neon-auth/server'

export const GET = async (request: Request) => {
  const origin = new URL(request.url).origin
  const result = await getAuth().signIn.social({
    provider: 'google',
    callbackURL: `${origin}/dashboard`,
    newUserCallbackURL: `${origin}/dashboard`,
    errorCallbackURL: `${origin}/sign-in`,
  })

  if (result.error || !result.data?.url) {
    return NextResponse.redirect(new URL('/sign-in?error=google', origin))
  }

  return NextResponse.redirect(result.data.url)
}
