'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/neon-auth/client'
import AuthShell, { authButtonClass, authInputClass } from '../AuthShell'
import { authHref, returnPathFromSearch } from '@/lib/auth-navigation'
import { userErrorMessage } from '@/lib/user-messages'

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
        setError(userErrorMessage(result.error, "We couldn't send a reset code. Please try again shortly."))
        return
      }
      setCodeSent(true)
    } catch (caught) {
      setError(userErrorMessage(caught, "We couldn't send a reset code. Please try again shortly."))
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
        setError(userErrorMessage(result.error, "We couldn't reset your password. Check the code and choose a password with at least 8 characters."))
        return
      }
      router.push(`${authHref('/sign-in', returnPathFromSearch(window.location.search))}&password=reset`)
    } catch (caught) {
      setError(userErrorMessage(caught, "We couldn't reset your password. Please try again."))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle={codeSent ? 'If an eligible account exists, a code will arrive in your inbox. Check spam too, then enter the code and choose a new password.' : 'Enter the email you use for TaleCrafter. If you joined with Google or GitHub, use that sign-in button instead.'} alternateHref="/sign-in" alternateLabel="Return to sign in">
      <form className="space-y-4" onSubmit={codeSent ? resetPassword : requestCode}>
        <label className="block text-sm font-medium">Email<input className={authInputClass} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={codeSent} required /></label>
        {codeSent ? <>
          <label className="block text-sm font-medium">Reset code<input className={authInputClass} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required /></label>
          <label className="block text-sm font-medium">New password<input className={authInputClass} type="password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        </> : null}
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button className={authButtonClass} type="submit" disabled={pending}>{pending ? 'Please wait...' : codeSent ? 'Set new password' : 'Send reset code'}</button>
        {codeSent && <button type="button" className="min-h-11 w-full text-sm text-[#d8c69e]" disabled={pending} onClick={() => { setCodeSent(false); setOtp(''); setError(''); }}>Change email or request a new code</button>}
      </form>
    </AuthShell>
  )
}
