'use client'

// The home page video in the Aesthetic Tool mock: the real HomeVideo section with the side's video from
// the Home Video tool (this week's, or the latest earlier one; else the newest entered), so the mock shows
// exactly what will go live. Shown here whether or not the switch is on; on the site it shows only when on.
import { useEffect, useState } from 'react'
import { HomeVideo, type HomeVideoData } from '@/components/site/HomeVideo'

type Row = HomeVideoData & { week_start: string }

export function MockHomeVideo({ girls }: { girls: boolean }) {
  const [state, setState] = useState<{ girls: boolean; video: Row | null; enabled: boolean } | null>(null)
  useEffect(() => {
    let off = false
    fetch(`/api/admin/home-videos?gender=${girls ? 'F' : 'M'}`).then(r => r.json()).then(d => {
      const rows = (d.rows ?? []) as Row[]
      const pick = rows.find(r => r.week_start === d.showing) ?? rows.filter(r => r.week_start <= d.thisWeek)[0] ?? rows[rows.length - 1] ?? null
      if (!off) setState({ girls, video: pick, enabled: !!d.enabled })
    }).catch(() => { if (!off) setState({ girls, video: null, enabled: false }) })
    return () => { off = true }
  }, [girls])
  if (!state || state.girls !== girls) return null
  if (!state.video) return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-3">Classic Match of the Week</h2>
      <div className="aspect-video border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-6">
        <p className="text-sm text-slate-500">No {girls ? 'girls' : 'boys'} video entered yet. Add one on Articles → Home Video to see it here.</p>
      </div>
    </section>
  )
  return (
    <>
      {!state.enabled && <p className="text-[11px] text-amber-700 mb-1">Preview: the {girls ? 'girls' : 'boys'} switch is off, so the site doesn&apos;t show this yet.</p>}
      <HomeVideo video={state.video} />
    </>
  )
}
