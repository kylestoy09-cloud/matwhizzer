'use client'
// Transfers (Kyle 2026-11-16): search an existing wrestler, pick the new team, and it is logged as a transfer for
// this season. The list runs all season and completes when the season is archived; each year keeps its list.
// Used on /admin/[side]/wrestlers/transfers and in the preseason task "Complete Transfers". API: /api/admin/transfers.

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Season = { id: number; label: string; open: boolean }
type Row = { id: number; wrestler_id: string; name: string; grade: string | null; from: string | null; to: string | null; notes: string | null; created_at: string; created_by: string | null }
type Found = { id: string; name: string; grade: string | null; school_id: number | null; school: string | null }
type School = { id: number; display_name: string }

const th = 'px-3 py-1 text-left text-xs font-semibold text-slate-600 whitespace-nowrap'
const td = 'px-3 py-1 text-sm text-slate-700'
const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function TransfersTool() {
  const { gender } = useAdminGender()
  const side = gender === 'F' ? 'girls' : 'boys'
  const [seasons, setSeasons] = useState<Season[]>([])
  const [current, setCurrent] = useState<Season | null>(null)
  const [season, setSeason] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [migrationPending, setMigrationPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  // the form
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Found[]>([])
  const [pick, setPick] = useState<Found | null>(null)
  const [sq, setSq] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [to, setTo] = useState<School | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load(id?: number | null) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/transfers?gender=${gender}${id ? `&season=${id}` : ''}`)
      const d = await res.json()
      if (d.error) { setFlash({ ok: false, text: d.error }); return }
      setMigrationPending(!!d.migrationPending)
      setSeasons(d.seasons ?? []); setCurrent(d.current ?? null); setSeason(d.season ?? null); setRows(d.rows ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { reset(); load() }, [gender])   // eslint-disable-line react-hooks/exhaustive-deps

  function reset() { setQ(''); setFound([]); setPick(null); setSq(''); setSchools([]); setTo(null); setNotes('') }

  function searchWrestlers(v: string) {
    setQ(v); setPick(null)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 2) { setFound([]); return }
    timer.current = setTimeout(async () => {
      const d = await (await fetch(`/api/admin/transfers?gender=${gender}&q=${encodeURIComponent(v.trim())}`)).json()
      setFound(d.wrestlers ?? [])
    }, 250)
  }

  function searchSchools(v: string) {
    setSq(v); setTo(null)
    if (sTimer.current) clearTimeout(sTimer.current)
    if (v.trim().length < 2) { setSchools([]); return }
    sTimer.current = setTimeout(async () => {
      const d = await (await fetch(`/api/admin/search-schools?q=${encodeURIComponent(v.trim())}`)).json()
      setSchools(d.schools ?? [])
    }, 250)
  }

  async function save() {
    if (!pick || !to) return
    setSaving(true)
    try {
      const d = await (await fetch('/api/admin/transfers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, wrestler_id: pick.id, to_school_id: to.id, notes }),
      })).json()
      if (d.error) { setFlash({ ok: false, text: d.error }); return }
      setFlash({ ok: true, text: `${pick.name}: ${pick.school ?? 'no team on file'} → ${to.display_name}, logged for ${current?.label}.${d.namesake ? ` Another wrestler named ${pick.name} is already linked at ${to.display_name}, so no name link was added.` : ''}` })
      reset(); load(current?.id)
    } finally { setSaving(false) }
  }

  async function undo(r: Row) {
    if (!confirm(`Undo ${r.name}'s transfer to ${r.to}?`)) return
    const d = await (await fetch(`/api/admin/transfers?gender=${gender}&id=${r.id}`, { method: 'DELETE' })).json()
    if (d.error) { setFlash({ ok: false, text: d.error }); return }
    setFlash({ ok: true, text: `Undid ${r.name}'s transfer.${d.linkKept ? ` The name link at ${r.to} stays: they have bouts there.` : ''}` })
    load(season)
  }

  const shown = seasons.find(s => s.id === season) ?? null
  const open = !!shown?.open

  return (
    <div className="p-4">
      {flash && (
        <div className={`mb-4 rounded border px-4 py-2 text-sm ${flash.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {flash.text} <button onClick={() => setFlash(null)} className="ml-2 text-xs underline">dismiss</button>
        </div>
      )}
      {migrationPending && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Run <code className="font-mono text-xs">docs/migrations/20261116_transfers.sql</code> in the Supabase SQL editor first.
        </div>
      )}

      {!migrationPending && current && (
        <div className="mb-6 rounded border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Log a transfer for {current.label}</h2>
          <label className="mb-1 block text-xs font-medium text-slate-500">Wrestler</label>
          {pick ? (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-800">{pick.name}</span>
              <span className="text-slate-500">{[pick.grade, pick.school ?? 'no team on file'].filter(Boolean).join(' · ')}</span>
              <button onClick={() => { setPick(null); setQ('') }} className="text-xs text-slate-500 underline">change</button>
            </div>
          ) : (
            <div className="mb-3">
              <input value={q} onChange={e => searchWrestlers(e.target.value)} placeholder="Search by name…"
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
              {found.length > 0 && (
                <ul className="mt-1 max-h-64 overflow-y-auto rounded border border-slate-200">
                  {found.map(w => (
                    <li key={w.id}>
                      <button onClick={() => { setPick(w); setFound([]) }} className="flex w-full justify-between gap-3 px-3 py-1 text-left text-sm hover:bg-slate-50">
                        <span className="font-medium text-slate-800">{w.name}</span>
                        <span className="text-slate-500">{[w.grade, w.school ?? 'no team on file'].filter(Boolean).join(' · ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.trim().length >= 2 && found.length === 0 && <p className="mt-1 text-xs text-slate-400">No active wrestler by that name.</p>}
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-slate-500">New team</label>
          {to ? (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-800">{to.display_name}</span>
              <button onClick={() => { setTo(null); setSq('') }} className="text-xs text-slate-500 underline">change</button>
            </div>
          ) : (
            <div className="mb-3">
              <input value={sq} onChange={e => searchSchools(e.target.value)} placeholder="Search schools…"
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
              {schools.length > 0 && (
                <ul className="mt-1 max-h-64 overflow-y-auto rounded border border-slate-200">
                  {schools.map(s => (
                    <li key={s.id}>
                      <button onClick={() => { setTo(s); setSchools([]) }} className="w-full px-3 py-1 text-left text-sm hover:bg-slate-50">{s.display_name}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-slate-500">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className="mb-3 w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />

          <button onClick={save} disabled={!pick || !to || saving}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
            {saving ? 'Saving…' : 'Log Transfer'}
          </button>
        </div>
      )}
      {!migrationPending && !loading && !current && (
        <p className="mb-6 text-sm text-slate-500">Every season is archived, so there is no open list to add to.</p>
      )}

      {seasons.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {seasons.map(s => (
            <button key={s.id} onClick={() => load(s.id)}
              className={`rounded border px-3 py-1 text-xs font-medium ${s.id === season ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {shown && (
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          {shown.label} Transfers · {rows.length}{' '}
          <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${open ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{open ? 'Open' : 'Complete'}</span>
        </h2>
      )}
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : rows.length === 0 ? (
        shown && <p className="text-sm text-slate-400">No transfers logged for {shown.label} yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-50"><tr>
              <th className={th}>Wrestler</th><th className={th}>Gr</th><th className={th}>From</th><th className={th}>To</th>
              <th className={th}>Notes</th><th className={th}>Logged</th>{open && <th className={th}></th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className={td}><Link href={`/admin/${side}/wrestlers/${r.wrestler_id}`} className="font-medium text-slate-800 hover:underline">{r.name}</Link></td>
                  <td className={td}>{r.grade ?? ''}</td>
                  <td className={td}>{r.from ?? <span className="text-slate-400">none on file</span>}</td>
                  <td className={`${td} font-medium`}>{r.to}</td>
                  <td className={`${td} text-slate-500`}>{r.notes ?? ''}</td>
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{fmt(r.created_at)}</td>
                  {open && <td className={`${td} text-right`}><button onClick={() => undo(r)} className="text-xs text-slate-500 underline hover:text-red-700">Undo</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
