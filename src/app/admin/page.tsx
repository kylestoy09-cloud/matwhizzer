import Link from 'next/link'

// /admin with no side remembered yet: pick one, the same way the home page asks.
// Once a side has been visited the middleware sends /admin straight there.
export default function AdminSidePicker() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] px-4">
      <h1 className="text-2xl font-bold text-slate-900">MatWhizzer Admin</h1>
      <p className="text-sm text-slate-500 mt-1">Which side are you working on?</p>
      <div className="flex gap-5 mt-8">
        <Link
          href="/admin/boys"
          className="flex items-center justify-center gap-2 w-36 py-3 bg-blue-600 text-white font-bold text-lg border-2 border-blue-600 rounded-full hover:bg-blue-700 hover:border-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Boys
          <span aria-hidden="true">→</span>
        </Link>
        <Link
          href="/admin/girls"
          className="flex items-center justify-center gap-2 w-36 py-3 bg-rose-800 text-white font-bold text-lg border-2 border-rose-800 rounded-full hover:bg-rose-900 hover:border-rose-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-800 focus-visible:ring-offset-2"
        >
          Girls
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
