'use client'

// Conference / Section / Group filter for the regular-season leaderboards. Applying it
// moves to a URL with the choice (?conf=…&sec=…&grp=…); all ticked = no filter.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getAllGroups } from '@/lib/sections'

const CONFS  = getAllConferences().map(c => ({ value: c.name, label: c.name }))
const SECS   = getAllSections().map(s => ({ value: s.name, label: s.name }))
const GROUPS = getAllGroups().map(g => ({ value: g.name, label: g.label }))

function MultiSelect({ label, options, selected, onChange }: {
  label: string
  options: { value: string; label: string }[]
  selected: Set<string>
  onChange: (v: Set<string>) => void
}) {
  const all = selected.size === options.length
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <button onClick={() => onChange(all ? new Set() : new Set(options.map(o => o.value)))} className="text-[11px] text-slate-400 hover:text-slate-700 underline">
          {all ? 'Clear' : 'All'}
        </button>
      </div>
      <div className="border border-slate-200 bg-white max-h-40 overflow-y-auto divide-y divide-slate-100">
        {options.map(o => (
          <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={selected.has(o.value)} className="accent-slate-800 shrink-0"
              onChange={() => { const n = new Set(selected); if (n.has(o.value)) n.delete(o.value); else n.add(o.value); onChange(n) }} />
            <span className="text-xs text-slate-700">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// hrefBase: the current URL without conf/sec/grp (and without n, so a new filter starts at 25)
export function LbFilters({ hrefBase, conf, sec, grp }: { hrefBase: string; conf: string[]; sec: string[]; grp: string[] }) {
  const router = useRouter()
  const init = (picked: string[], opts: { value: string }[]) => new Set(picked.length ? picked : opts.map(o => o.value))
  const [c, setC] = useState(() => init(conf, CONFS))
  const [s, setS] = useState(() => init(sec, SECS))
  const [g, setG] = useState(() => init(grp, GROUPS))
  const key = (x: Set<string>, opts: { value: string }[]) => (x.size === opts.length || x.size === 0 ? '' : [...x].sort().join(','))
  const applied = [conf.slice().sort().join(','), sec.slice().sort().join(','), grp.slice().sort().join(',')].join('|')
  const staged = [key(c, CONFS), key(s, SECS), key(g, GROUPS)].join('|')
  const filtered = conf.length + sec.length + grp.length > 0

  function go(cc: string, ss: string, gg: string) {
    const q = new URLSearchParams()
    if (cc) q.set('conf', cc)
    if (ss) q.set('sec', ss)
    if (gg) q.set('grp', gg)
    const sep = hrefBase.includes('?') ? '&' : '?'
    router.push(q.toString() ? `${hrefBase}${sep}${q}` : hrefBase, { scroll: false })
  }

  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by</span>
        <div className="flex items-center gap-3">
          {filtered && (
            <button onClick={() => { setC(init([], CONFS)); setS(init([], SECS)); setG(init([], GROUPS)); go('', '', '') }}
              className="text-xs text-slate-400 hover:text-slate-700 underline">Reset — show all</button>
          )}
          {staged !== applied && (
            <button onClick={() => go(key(c, CONFS), key(s, SECS), key(g, GROUPS))}
              className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Apply</button>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <MultiSelect label="Conference" options={CONFS} selected={c} onChange={setC} />
        <MultiSelect label="Section" options={SECS} selected={s} onChange={setS} />
        <MultiSelect label="Group" options={GROUPS} selected={g} onChange={setG} />
      </div>
    </div>
  )
}
