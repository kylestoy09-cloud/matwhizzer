import Link from 'next/link'
import { StateContent } from '@/components/StateContent'
import { getActiveSeason } from '@/lib/get-season'

export default async function GirlsStatePage() {
  const season = await getActiveSeason()
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/girls" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← Girls Search
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rose-900">Girls State Championships</h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA 2024–25 · Boardwalk Hall · double elimination</p>
      </div>
      <StateContent gender="F" season={season} />
    </div>
  )
}
