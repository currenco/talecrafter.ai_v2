'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/neon-auth/client'
import AuthShell, { authButtonClass, authInputClass } from '../AuthShell'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') ?? '')
  }, [])

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp })
      if (result.error) {
        setError(result.error.message ?? 'Verification failed')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell title="Verify your email" subtitle="Enter the code sent to your inbox." alternateHref="/sign-in" alternateLabel="Return to sign in">
      <form className="space-y-4" onSubmit={verify}>
        <label className="block text-sm font-medium">Email<input className={authInputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label className="block text-sm font-medium">Verification code<input className={authInputClass} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required /></label>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button className={authButtonClass} type="submit" disabled={pending}>{pending ? 'Verifying...' : 'Verify email'}</button>
      </form>
    </AuthShell>
  )
}
