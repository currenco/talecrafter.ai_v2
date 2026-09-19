'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/neon-auth/client'
import AuthShell, { authButtonClass, authInputClass } from '../../AuthShell'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')

    try {
      const result = await authClient.signUp.email({ name, email, password })
      if (result.error) {
        setError(result.error.message ?? 'Sign up failed')
        return
      }

      const verification = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
      if (verification.error) {
        setError(verification.error.message ?? 'Unable to send verification code')
        return
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign up failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start with five credits and build your first story." alternateHref="/sign-in" alternateLabel="Already have an account? Sign in">
      <form className="space-y-4" onSubmit={signUp}>
        <label className="block text-sm font-medium">Name<input className={authInputClass} autoComplete="name" value={name} onChange={event => setName(event.target.value)} required /></label>
        <label className="block text-sm font-medium">Email<input className={authInputClass} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label className="block text-sm font-medium">Password<input className={authInputClass} type="password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button className={authButtonClass} type="submit" disabled={pending}>{pending ? 'Creating account...' : 'Create account'}</button>
      </form>
    </AuthShell>
  )
}
