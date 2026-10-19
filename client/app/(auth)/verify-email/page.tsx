'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/neon-auth/client'
import AuthShell, { authButtonClass, authInputClass } from '../AuthShell'
import { returnPathFromSearch } from '@/lib/auth-navigation'
import { userErrorMessage } from '@/lib/user-messages'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') ?? '')
    if (new URLSearchParams(window.location.search).get('send') === 'failed') setError("Your account was created, but the code couldn't be sent. Choose Send a new code below.")
  }, [])

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp })
      if (result.error) {
        setError(userErrorMessage(result.error, "We couldn't verify that code. Check your latest email or request a new code."))
        return
      }
      router.push(returnPathFromSearch(window.location.search))
      router.refresh()
    } catch (caught) {
      setError(userErrorMessage(caught, "We couldn't verify your email. Please try again."))
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError('')
    setNotice('')
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
      if (result.error) setError(userErrorMessage(result.error, "We couldn't send a new code. Please try again shortly."))
      else setNotice('A new code has been requested. Check your inbox and spam folder.')
    } catch (error) { setError(userErrorMessage(error, "We couldn't send a new code. Please try again shortly.")) }
    finally { setResending(false) }
  }

  return (
    <AuthShell title="Verify your email" subtitle="Enter the code sent to your inbox." alternateHref="/sign-in" alternateLabel="Return to sign in">
      <form className="space-y-4" onSubmit={verify}>
        <label className="block text-sm font-medium">Email<input className={authInputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label className="block text-sm font-medium">Verification code<input className={authInputClass} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required /></label>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button className={authButtonClass} type="submit" disabled={pending}>{pending ? 'Verifying...' : 'Verify email'}</button>
        <button className="min-h-11 w-full text-sm text-[#d8c69e] disabled:opacity-50" type="button" disabled={resending || pending || !email} onClick={() => void resend()}>{resending ? 'Sending code...' : 'Send a new code'}</button>
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </form>
    </AuthShell>
  )
}
