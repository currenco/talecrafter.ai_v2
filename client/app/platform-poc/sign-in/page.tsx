'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { neonPocAuthClient } from '@/lib/neon-auth/client'

export default function PlatformPocSignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')

    const result = await neonPocAuthClient.signIn.email({ email, password })
    setPending(false)

    if (result.error) {
      setError(result.error.message ?? 'Sign in failed')
      return
    }

    router.push('/platform-poc/protected')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <section className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Platform proof sign in</h1>
        <form className="mt-6 space-y-4" onSubmit={signIn}>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            <LogIn aria-hidden="true" size={16} />
            {pending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <a
          className="mt-3 w-full rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
          href="/platform-poc/google"
        >
          Continue with Google
        </a>
      </section>
    </main>
  )
}
