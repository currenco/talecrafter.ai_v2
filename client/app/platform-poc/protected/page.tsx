import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getNeonPocAuth } from '@/lib/neon-auth/server'

export const dynamic = 'force-dynamic'

export default async function PlatformPocProtectedPage() {
  const { data: session } = await getNeonPocAuth().getSession()
  if (!session?.user) redirect('/platform-poc/sign-in')

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <section className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Authenticated</h1>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-medium text-neutral-600">User ID</dt>
          <dd className="break-all">{session.user.id}</dd>
          <dt className="font-medium text-neutral-600">Email</dt>
          <dd>{session.user.email}</dd>
        </dl>
        <Link
          className="mt-6 inline-block text-sm font-medium underline"
          href="/platform-poc/sign-in"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  )
}
