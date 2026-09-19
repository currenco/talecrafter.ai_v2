'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/neon-auth/client'
import AuthShell, { authButtonClass, authInputClass } from '../../AuthShell'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')

    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Sign in failed')
        return
      }

      const redirectTo = new URLSearchParams(window.location.search).get('redirect')
      const isLocalPath =
        Boolean(redirectTo?.startsWith('/')) && !redirectTo?.startsWith('//')
      router.push(isLocalPath && redirectTo ? redirectTo : '/dashboard')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue creating and reading your stories."
      alternateHref="/sign-up"
      alternateLabel="New here? Create an account"
    >
      <form className="space-y-4" onSubmit={signIn}>
        <label className="block text-sm font-medium">
          Email
          <input className={authInputClass} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input className={authInputClass} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
        </label>
        <div className="text-right">
          <Link className="text-sm text-blue-300 hover:text-blue-200" href="/forgot-password">Forgot password?</Link>
        </div>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button className={authButtonClass} type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-blue-100/50"><span className="h-px flex-1 bg-blue-300/20" />OR<span className="h-px flex-1 bg-blue-300/20" /></div>
      <a className="flex min-h-11 w-full items-center justify-center rounded-md border border-blue-300/25 text-sm font-semibold hover:bg-white/5" href="/auth/google">Continue with Google</a>
    </AuthShell>
  )
}
