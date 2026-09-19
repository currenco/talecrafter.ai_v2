'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/neon-auth/client'
import AuthShell, { authButtonClass, authInputClass } from '../AuthShell'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email })
      if (result.error) {
        setError(result.error.message ?? 'Unable to send reset code')
        return
      }
      setCodeSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send reset code')
    } finally {
      setPending(false)
    }
  }

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await authClient.emailOtp.resetPassword({ email, otp, password })
      if (result.error) {
        setError(result.error.message ?? 'Unable to reset password')
        return
      }
      router.push('/sign-in')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reset password')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle={codeSent ? 'Enter the code from your email and choose a new password.' : 'We will send a reset code to your email.'} alternateHref="/sign-in" alternateLabel="Return to sign in">
      <form className="space-y-4" onSubmit={codeSent ? resetPassword : requestCode}>
        <label className="block text-sm font-medium">Email<input className={authInputClass} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={codeSent} required /></label>
        {codeSent ? <>
          <label className="block text-sm font-medium">Reset code<input className={authInputClass} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required /></label>
          <label className="block text-sm font-medium">New password<input className={authInputClass} type="password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        </> : null}
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button className={authButtonClass} type="submit" disabled={pending}>{pending ? 'Please wait...' : codeSent ? 'Set new password' : 'Send reset code'}</button>
      </form>
    </AuthShell>
  )
}
