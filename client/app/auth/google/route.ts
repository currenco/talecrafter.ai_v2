import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/neon-auth/server'
import { authHref, returnPathFromSearch } from '@/lib/auth-navigation'

export const GET = async (request: Request) => {
  const origin = new URL(request.url).origin
  const destination = returnPathFromSearch(new URL(request.url).search)
  const errorPath = `${authHref('/sign-in', destination)}&error=google`
  const result = await getAuth().signIn.social({
    provider: 'google',
    callbackURL: `${origin}${destination}`,
    newUserCallbackURL: `${origin}${destination}`,
    errorCallbackURL: `${origin}${errorPath}`,
  })

  if (result.error || !result.data?.url) {
    return NextResponse.redirect(new URL(errorPath, origin))
  }

  return NextResponse.redirect(result.data.url)
}
