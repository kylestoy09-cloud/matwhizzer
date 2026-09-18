import Link from 'next/link'

export function AdminBackButton({ href = '/admin', label = '← Back to Admin' }: { href?: string; label?: string } = {}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
    >
      {label}
    </Link>
  )
}
