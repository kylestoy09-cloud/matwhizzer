import Link from 'next/link'

export function AdminBackButton() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
    >
      <span>←</span> Back to Admin
    </Link>
  )
}
