'use client'

// Conference / Section / Group filter for the regular-season leaderboards (2026-11-07, Kyle): three
// dropdowns that start at All, with what's picked shown under each label. Picking a conference turns
// Section and Group off; picking a section or group turns Conference off. Each tick applies right
// away (moves to a URL with the choice: ?conf=…&sec=…&grp=…; nothing picked = no filter).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getAllGroups } from '@/lib/sections'
import { FilterDrop } from '@/components/site/FilterDrop'

const CONFS  = getAllConferences().map(c => ({ value: c.name, label: c.name }))
const SECS   = getAllSections().map(s => ({ value: s.name, label: s.name }))
const GROUPS = getAllGroups().map(g => ({ value: g.name, label: g.label }))

// hrefBase: the current URL without conf/sec/grp (and without n, so a new filter starts at 25)
export function LbFilters({ hrefBase, conf, sec, grp }: { hrefBase: string; conf: string[]; sec: string[]; grp: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const c = new Set(conf), s = new Set(sec), g = new Set(grp)
  const confOn = c.size > 0, sgOn = s.size > 0 || g.size > 0

  function go(cc: Set<string>, ss: Set<string>, gg: Set<string>) {
    const q = new URLSearchParams()
    if (cc.size) q.set('conf', [...cc].sort().join(','))
    if (ss.size) q.set('sec', [...ss].sort().join(','))
    if (gg.size) q.set('grp', [...gg].sort().join(','))
    const sep = hrefBase.includes('?') ? '&' : '?'
    router.push(q.toString() ? `${hrefBase}${sep}${q}` : hrefBase, { scroll: false })
  }
  const none = new Set<string>()

  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by</span>
        {(confOn || sgOn) && (
          <button onClick={() => { setOpen(null); go(none, none, none) }} className="text-xs text-slate-400 hover:text-slate-700 underline">Reset — show all</button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <FilterDrop label="Conference" options={CONFS} picked={c} onChange={v => go(v, none, none)} disabled={sgOn} open={open === 'c'} setOpen={v => setOpen(v ? 'c' : null)} />
        <FilterDrop label="Section" options={SECS} picked={s} onChange={v => go(none, v, g)} disabled={confOn} open={open === 's'} setOpen={v => setOpen(v ? 's' : null)} />
        <FilterDrop label="Group" options={GROUPS} picked={g} onChange={v => go(none, s, v)} disabled={confOn} open={open === 'g'} setOpen={v => setOpen(v ? 'g' : null)} />
      </div>
    </div>
  )
}
