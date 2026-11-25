'use client'
// Whiz Rank workbench (Kyle 2026-11-17): pick the week, weight and section; move wrestlers up and down; Save; Submit
// locks the weight/section. When every weight/section is submitted the week is ready and publishes Monday 8 AM.
// Each row opens to the wrestler's record for the week and recent bouts against expectation. API: /api/admin/whiz-rank

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RATING_SHORT } from '@/lib/rating'

type Week = { id: number; week_number: number; week_date: string; publish_at: string | null; ready_at: string | null; published_at: string | null; submitted: string[]; notices: string[] }
type Finish = { district: number | null; region: number | null; state: number | null }
type Row = { wrestler_id: string; name: string; grade: string | null; school: string | null; whiz: number | null; prev_whiz: number | null; wrr: number; wrr_rank: number; finish: Finish; offseason: { rank: number; score: number } | null }
type Board = { rows: Row[]; saved: boolean; submitted: boolean; source: string; unplaced: number; notices: { id: number; message: string; created_at: string }[]; week: { published_at: string | null } }
type Match = { date: string; opponent_id: string | null; opponent: string; opponent_school: string | null; opponent_whiz: { rank: number; weight: number; section: string } | null; opponent_wrr: number; expected: string; actual: string; vs: 'above' | 'below' | 'met' }
type Detail = { record: { wins: number; losses: number; from: string; to: string }; notableWins: Match[]; notableLosses: Match[]; matches: Match[] }

const TOP = 25
const th = 'px-2 py-1 text-left text-[11px] font-semibold uppercase text-slate-500 whitespace-nowrap'
const td = 'px-2 py-1 text-sm whitespace-nowrap'
const ord = (n: number | null) => (n == null ? '—' : n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`)
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtTime = (t: string | null) => (t ? new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—')

export function WhizRankWorkbench() {
  const { gender } = useAdminGender()
  const side = gender === 'F' ? 'girls' : 'boys'
  const [weeks, setWeeks] = useState<Week[]>([])
  const [weights, setWeights] = useState<number[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [week, setWeek] = useState<number | null>(null)
  const [weight, setWeight] = useState<number | null>(null)
  const [section, setSection] = useState<string | null>(null)
  const [board, setBoard] = useState<Board | null>(null)
  const [order, setOrder] = useState<Row[]>([])
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, Detail | 'loading'>>({})
  const [showAll, setShowAll] = useState(false)

  const loadWeeks = useCallback(async () => {
    const d = await (await fetch(`/api/admin/whiz-rank?gender=${gender}`)).json()
    if (d.error) { setMsg({ ok: false, text: d.error }); return }
    setWeeks(d.weeks); setWeights(d.weights); setSections(d.sections)
    setWeek(w => w ?? (d.weeks.find((x: Week) => !x.published_at) ?? d.weeks[0])?.id ?? null)
    setWeight(w => w ?? d.weights[0]); setSection(s => (s && d.sections.includes(s) ? s : d.sections[0]))
  }, [gender])
  useEffect(() => { setWeek(null); setWeight(null); setSection(null); setBoard(null); loadWeeks() }, [gender, loadWeeks])

  const loadBoard = useCallback(async () => {
    if (!week || !weight || !section) return
    setBusy(true); setOpen(null)
    try {
      const d = await (await fetch(`/api/admin/whiz-rank?gender=${gender}&week=${week}&weight=${weight}&section=${encodeURIComponent(section)}`)).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return }
      setBoard(d); setOrder(d.rows); setDirty(false)
    } finally { setBusy(false) }
  }, [gender, week, weight, section])
  useEffect(() => { loadBoard() }, [loadBoard])

  const locked = !!board?.submitted || !!board?.week.published_at
  const move = (i: number, to: number) => {
    if (locked || to < 0 || to >= order.length) return
    setOrder(o => { const n = [...o]; const [r] = n.splice(i, 1); n.splice(to, 0, r); return n })
    setDirty(true)
  }

  async function save(): Promise<boolean> {
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/whiz-rank', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, week, weight, section, order: order.slice(0, TOP).map(r => r.wrestler_id) }) })).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return false }
      setDirty(false); setMsg({ ok: true, text: `${weight} ${section} saved.` })
      return true
    } finally { setBusy(false) }
  }

  async function submit(on: boolean) {
    if (on && (dirty || !board?.saved) && !(await save())) return
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/whiz-rank', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, week, weight, section, submitted: on }) })).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return }
      setMsg({ ok: true, text: on ? `${weight} ${section} submitted — ${d.done} of ${d.total}${d.ready ? '. Every weight is in: the week is ready to publish.' : '.'}` : `${weight} ${section} reopened.` })
      await Promise.all([loadWeeks(), loadBoard()])
    } finally { setBusy(false) }
  }

  async function toggle(r: Row) {
    if (open === r.wrestler_id) { setOpen(null); return }
    setOpen(r.wrestler_id)
    if (!detail[`${week}|${r.wrestler_id}`]) {
      setDetail(x => ({ ...x, [`${week}|${r.wrestler_id}`]: 'loading' }))
      const d = await (await fetch(`/api/admin/whiz-rank?gender=${gender}&week=${week}&wrestler=${r.wrestler_id}`)).json()
      setDetail(x => ({ ...x, [`${week}|${r.wrestler_id}`]: d.error ? { record: { wins: 0, losses: 0, from: '', to: '' }, notableWins: [], notableLosses: [], matches: [] } : d }))
    }
  }

  const wk = weeks.find(w => w.id === week)
  const total = weights.length * sections.length
  const isIn = (wt: number, s: string) => !!wk?.submitted.includes(`${wt}|${s}`)
  const hasNotice = (wt: number, s: string) => !!wk?.notices?.includes(`${wt}|${s}`)
  const shown = showAll ? order : order.slice(0, Math.max(TOP + 15, 40))

  return (
    <div className="p-4 space-y-3">
      {msg && <div className={`border px-3 py-2 text-sm ${msg.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{msg.text} <button onClick={() => setMsg(null)} className="ml-2 text-xs underline">dismiss</button></div>}

      {/* weeks */}
      <div className="flex flex-wrap gap-1.5">
        {weeks.map(w => (
          <button key={w.id} onClick={() => setWeek(w.id)}
            className={`border px-2.5 py-1 text-xs font-medium ${w.id === week ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            Wk {w.week_number} · {fmtDay(w.week_date)}{w.published_at ? ' ✓' : w.ready_at ? ' ●' : ` ${w.submitted.length}/${total}`}
          </button>
        ))}
      </div>
      {wk && (
        <p className="text-xs text-slate-500">
          Publishes {fmtTime(wk.publish_at)} ET · {wk.published_at ? <strong className="text-emerald-700">Published</strong> : wk.ready_at ? <strong className="text-emerald-700">Ready — every weight submitted</strong> : `${wk.submitted.length} of ${total} weight/sections submitted`}
        </p>
      )}

      {/* weight × section grid: ✓ = submitted */}
      <div className="overflow-x-auto">
        <table className="text-xs">
          <tbody>
            {sections.map(s => (
              <tr key={s}>
                <td className="pr-2 font-semibold text-slate-600 whitespace-nowrap">{s}</td>
                {weights.map(wt => (
                  <td key={wt} className="p-0.5">
                    <button onClick={() => { setWeight(wt); setSection(s) }}
                      className={`w-11 border py-0.5 tabular-nums ${wt === weight && s === section ? 'border-slate-900 bg-slate-900 text-white' : isIn(wt, s) ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {wt}{isIn(wt, s) ? '✓' : ''}{hasNotice(wt, s) && <span className="text-amber-600">!</span>}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {board && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">{weight} · {section}</h2>
          <span className="text-xs text-slate-400">Order from: {board.source}{dirty ? ' (unsaved changes)' : ''}</span>
          {board.unplaced > 0 && <span className="text-xs text-amber-700">{board.unplaced} rated at {weight} aren&apos;t on any section&apos;s board: no school on their rating, or a Non-Public school without a locale section</span>}
          <div className="ml-auto flex gap-2">
            {!locked && <button onClick={save} disabled={busy || !dirty} className="border border-slate-400 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40">Save</button>}
            {!board.week.published_at && (board.submitted
              ? <button onClick={() => submit(false)} disabled={busy} className="border border-slate-400 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40">Reopen</button>
              : <button onClick={() => submit(true)} disabled={busy} className="bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40">Submit {weight} {section}</button>)}
          </div>
        </div>
      )}

      {board && board.notices.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {board.notices.map(n => <p key={n.id}>{n.message}</p>)}
          <p className="mt-1 text-xs text-amber-700">Cleared when this board is submitted.</p>
        </div>
      )}

      {busy && !board ? <p className="text-sm text-slate-400">Loading…</p> : board && (
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-50"><tr>
              <th className={th}></th><th className={th}>Whiz</th><th className={th}>Last Wk</th><th className={th}>Wrestler</th><th className={th}>School</th>
              <th className={th}>{RATING_SHORT} #</th><th className={th}>{RATING_SHORT}</th><th className={th}>Dist</th><th className={th}>Reg</th><th className={th}>State</th><th className={th}>Off-Season</th><th className={th}></th>
            </tr></thead>
            <tbody>
              {shown.map((r, i) => {
                const d = detail[`${week}|${r.wrestler_id}`]
                return (
                  <Fragment key={r.wrestler_id}>
                    {i === TOP && <tr><td colSpan={12} className="border-t-2 border-slate-900 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-500">Not ranked</td></tr>}
                    <tr className={`border-t border-slate-100 ${i < TOP ? '' : 'text-slate-500'}`}>
                      <td className={`${td} text-slate-400`}>
                        {!locked && <>
                          <button onClick={() => move(i, i - 1)} className="px-1 hover:text-slate-900" title="Up">▲</button>
                          <button onClick={() => move(i, i + 1)} className="px-1 hover:text-slate-900" title="Down">▼</button>
                          <input type="number" min={1} max={order.length} placeholder="#" title="Move to"
                            onKeyDown={e => { if (e.key === 'Enter') { const n = Number((e.target as HTMLInputElement).value); if (n >= 1) move(i, n - 1); (e.target as HTMLInputElement).value = '' } }}
                            className="ml-1 w-10 border border-slate-200 px-1 text-xs" />
                        </>}
                      </td>
                      <td className={`${td} font-bold tabular-nums`}>{i < TOP ? i + 1 : ''}</td>
                      <td className={`${td} tabular-nums text-slate-400`}>
                        {r.prev_whiz ?? '—'}
                        {i < TOP && r.prev_whiz != null && r.prev_whiz !== i + 1 && <span className={`ml-1 text-[11px] ${r.prev_whiz > i + 1 ? 'text-emerald-600' : 'text-red-600'}`}>{r.prev_whiz > i + 1 ? `▲${r.prev_whiz - i - 1}` : `▼${i + 1 - r.prev_whiz}`}</span>}
                      </td>
                      <td className={td}><Link href={`/admin/${side}/wrestlers/${r.wrestler_id}`} className="font-medium text-slate-900 hover:underline">{r.name}</Link>{r.grade && <span className="ml-1 text-xs text-slate-400">{r.grade}</span>}</td>
                      <td className={`${td} text-slate-600`}>{r.school ?? '—'}</td>
                      <td className={`${td} tabular-nums`}>{r.wrr_rank}</td>
                      <td className={`${td} tabular-nums`}>{r.wrr.toFixed(1)}</td>
                      <td className={`${td} tabular-nums`}>{ord(r.finish.district)}</td>
                      <td className={`${td} tabular-nums`}>{ord(r.finish.region)}</td>
                      <td className={`${td} tabular-nums`}>{ord(r.finish.state)}</td>
                      <td className={`${td} tabular-nums`}>{r.offseason ? `#${r.offseason.rank}` : '—'}</td>
                      <td className={td}><button onClick={() => toggle(r)} className="text-xs text-slate-500 underline">{open === r.wrestler_id ? 'hide' : 'matches ▾'}</button></td>
                    </tr>
                    {open === r.wrestler_id && (
                      <tr><td colSpan={12} className="bg-slate-50 px-4 py-2">
                        {!d || d === 'loading' ? <p className="text-xs text-slate-400">Loading…</p> : (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-slate-700">Last 7 days ({fmtDay(d.record.from)} – {fmtDay(d.record.to)}): {d.record.wins}-{d.record.losses}</p>
                            {[['Notable wins', d.notableWins, 'text-emerald-700'], ['Notable losses', d.notableLosses, 'text-red-700']].map(([label, list, color]) => (
                              <div key={label as string} className="text-xs">
                                <span className={`font-semibold ${color}`}>{label as string} (last 20):</span>{' '}
                                {(list as Match[]).length === 0 ? <span className="text-slate-400">none</span> : (list as Match[]).map((m, j) => (
                                  <span key={j} className="mr-3">{m.actual} vs {m.opponent}{m.opponent_whiz ? ` (#${m.opponent_whiz.rank} ${m.opponent_whiz.section})` : ''} · {RATING_SHORT} {m.opponent_wrr.toFixed(1)} · {fmtDay(m.date)}</span>
                                ))}
                              </div>
                            ))}
                            {d.matches.length === 0 ? <p className="text-xs text-slate-400">No rated bouts yet.</p> : (
                              <table className="text-xs">
                                <thead><tr>{['Date', 'Opponent', 'Opp Whiz', `Opp ${RATING_SHORT}`, 'Expected', 'Actual', ''].map(h => <th key={h} className="px-2 py-0.5 text-left font-semibold text-slate-500">{h}</th>)}</tr></thead>
                                <tbody>
                                  {d.matches.map((m, j) => (
                                    <tr key={j} className="border-t border-slate-200">
                                      <td className="px-2 py-0.5 tabular-nums text-slate-500">{fmtDay(m.date)}</td>
                                      <td className="px-2 py-0.5">{m.opponent}{m.opponent_school && <span className="text-slate-400"> · {m.opponent_school}</span>}</td>
                                      <td className="px-2 py-0.5 tabular-nums">{m.opponent_whiz ? `#${m.opponent_whiz.rank} ${m.opponent_whiz.weight} ${m.opponent_whiz.section}` : '—'}</td>
                                      <td className="px-2 py-0.5 tabular-nums">{m.opponent_wrr.toFixed(1)}</td>
                                      <td className="px-2 py-0.5 text-slate-500">{m.expected}</td>
                                      <td className="px-2 py-0.5 font-medium">{m.actual}</td>
                                      <td className={`px-2 py-0.5 font-semibold ${m.vs === 'above' ? 'text-emerald-600' : m.vs === 'below' ? 'text-red-600' : 'text-slate-400'}`}>{m.vs === 'above' ? '▲ above' : m.vs === 'below' ? '▼ below' : '= as expected'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </td></tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {order.length > shown.length && <button onClick={() => setShowAll(true)} className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800">Show all {order.length}</button>}
        </div>
      )}
    </div>
  )
}
