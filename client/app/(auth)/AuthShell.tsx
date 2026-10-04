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
    <main className="relative flex min-h-[calc(100vh-9rem)] items-center justify-center overflow-hidden bg-[#0b1522] px-4 py-16 text-[#c3cbd4]">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(67,91,117,0.5),transparent_55%)]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-[#d8c69e]/20 bg-[#111d2b]/90 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8c69e]">TaleCrafter account</p>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-[#f1eadb]">{title}</h1>
        <p className="mt-2 text-sm text-[#c3cbd4]/70">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <Link
          className="mt-6 block text-center text-sm font-medium text-[#d8c69e] hover:text-[#f1eadb]"
          href={alternateHref}
        >
          {alternateLabel}
        </Link>
      </section>
    </main>
  )
}

export const authInputClass =
  'mt-1 w-full rounded-xl border border-[#d8c69e]/20 bg-[#0b1522]/75 px-4 py-3 text-[#f1eadb] outline-none placeholder:text-[#c3cbd4]/35 focus:border-[#d8c69e]/60 focus:ring-2 focus:ring-[#d8c69e]/15'

export const authButtonClass =
  'flex min-h-11 w-full items-center justify-center rounded-full border border-[#e2d2ae] bg-gradient-to-br from-[#eee0c0] to-[#cbb789] px-4 py-2.5 text-sm font-semibold text-[#101a28] hover:from-[#f5e8ca] hover:to-[#d8c69e] disabled:cursor-not-allowed disabled:opacity-60'
