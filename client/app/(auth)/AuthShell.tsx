import Link from 'next/link'

export default function AuthShell({
  title,
  subtitle,
  children,
  alternateHref,
  alternateLabel,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  alternateHref: string
  alternateLabel: string
}) {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-[#020b1f] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-lg border border-blue-300/20 bg-[#071329] p-6 shadow-2xl sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-blue-100/70">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <Link
          className="mt-6 block text-center text-sm font-medium text-blue-300 hover:text-blue-200"
          href={alternateHref}
        >
          {alternateLabel}
        </Link>
      </section>
    </main>
  )
}

export const authInputClass =
  'mt-1 w-full rounded-md border border-blue-300/25 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-blue-400'

export const authButtonClass =
  'flex min-h-11 w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60'
