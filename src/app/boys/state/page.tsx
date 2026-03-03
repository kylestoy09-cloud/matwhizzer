import Link from 'next/link'
import { StateContent } from '@/components/StateContent'

export default function StateBoysPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/boys" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← Boys Search
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Boys State Championships</h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA 2024–25 · Atlantic City · 32-man double elimination</p>
      </div>
      <StateContent gender="M" />
    </div>
  )
}
