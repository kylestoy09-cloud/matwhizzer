'use client'

// Offseason Hub · Public board (Kyle 2026-11-13: "a way for me to edit the order in which these wrestlers are
// displayed"). Each list on the Insight Off-Season board — Most Notable Overall and every weight — in the order the
// site shows it. Move wrestlers with the arrows or type a position, then Save; Reset goes back to the score order.
// A weight list: your order, then anyone new by score. Most Notable Overall: exactly your list once saved (add or take
// off wrestlers here). Scores show here for reference only; the site never shows them.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { OffseasonBoardData } from '@/lib/offseasonPublic'

const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const td = 'px-3 py-1'
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'

export function BoardOrderTab({ gender, side }: { gender: 'M' | 'F'; side: string }) {
  const [board, setBoard] = useState<OffseasonBoardData | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState('overall')
  const [ids, setIds] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [add, setAdd] = useState('')

  const show = (b: OffseasonBoardData | null, l: string) => { setIds(b?.lists[l] ?? []); setDirty(false) }
  const load = useCallback((l: string) => {
    fetch(`/api/admin/hub/board?gender=${gender}`).then(r => r.json())
      .then(d => { if (d.error) return setError(d.error); setBoard(d.board); show(d.board, l) }).catch(() => setError('Could not load'))
  }, [gender])
  useEffect(() => { load('overall') }, [load])

  if (error) return <p className="text-sm text-red-600">{error}{error.includes('offseason_board_order') ? ' — run docs/migrations/20261113_offseason_board_order.sql first.' : ''}</p>
  if (board === undefined) return <p className="text-sm text-slate-400">Loading…</p>
  if (!board) return <p className="text-sm text-slate-500">No offseason results yet.</p>

  const byId = new Map(board.entries.map(e => [e.wrestler_id, e]))
  const custom = (board.ordered[list] ?? []).length > 0
  const move = (from: number, to: number) => {
    to = Math.max(0, Math.min(ids.length - 1, to))
    if (from === to) return
    const next = [...ids]; const [x] = next.splice(from, 1); next.splice(to, 0, x)
    setIds(next); setDirty(true); setMsg(null)
  }
  const save = async () => {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/hub/board', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, season: board.season, list, ids }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer' }))
    setBusy(false)
    if (!res.ok) return setMsg(d.error)
    setMsg('Saved — the site shows this order now'); load(list)
  }
  const reset = async () => {
    if (!confirm('Go back to the score order for this list?')) return
    setBusy(true); setMsg(null)
    const res = await fetch(`/api/admin/hub/board?gender=${gender}&season=${board.season}&list=${encodeURIComponent(list)}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({ error: 'The server did not answer' }))
    setBusy(false)
    if (!res.ok) return setMsg(d.error)
    setMsg('Back to the score order'); load(list)
  }
  const others = list === 'overall' ? board.entries.filter(e => !ids.includes(e.wrestler_id)) : []

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        The order of each list on Insight · Off-Season ({board.season} offseason, classes of {board.classes.join(', ')}). Move wrestlers, then Save. Scores show here only.
      </p>
      <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
        <select value={list} onChange={e => { if (!dirty || confirm('Leave without saving?')) { setList(e.target.value); show(board, e.target.value) } }} className={input}>
          <option value="overall">Most Notable Overall{(board.ordered.overall ?? []).length ? ' · your order' : ''}</option>
          {board.weights.map(w => <option key={w} value={w}>{w}{(board.ordered[w] ?? []).length ? ' · your order' : ''}</option>)}
        </select>
        <button onClick={save} disabled={busy || !dirty} className="px-3 py-1 bg-black text-white text-sm disabled:opacity-40">{busy ? 'Saving…' : 'Save order'}</button>
        {custom && <button onClick={reset} disabled={busy} className="px-3 py-1 border border-slate-300 text-sm hover:border-black">Reset to score order</button>}
        <span className="text-xs text-slate-500">{custom ? 'Your order' : 'Score order (not set yet)'}</span>
        {msg && <span className={`text-xs font-semibold ${msg.startsWith('Saved') || msg.startsWith('Back') ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</span>}
      </div>
      {list === 'overall' && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <select value={add} onChange={e => setAdd(e.target.value)} className={`${input} max-w-md`}>
            <option value="">Add a wrestler to this list…</option>
            {others.map(e => <option key={e.wrestler_id} value={e.wrestler_id}>{e.name} · {e.weight} · {e.school} ({e.score})</option>)}
          </select>
          <button disabled={!add} onClick={() => { setIds([...ids, add]); setAdd(''); setDirty(true); setMsg(null) }} className="px-3 py-1 border border-slate-300 text-sm hover:border-black disabled:opacity-40">Add</button>
        </div>
      )}
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr><th className={th}>#</th><th className={th}>Move</th>{list === 'overall' && <th className={th}>Wt</th>}<th className={th}>Wrestler</th><th className={th}>School</th><th className={th}>Class</th><th className={th}>Best result</th><th className={th}>Score</th>{list === 'overall' && <th className={th}></th>}</tr>
        </thead>
        <tbody>
          {ids.map((id, i) => {
            const e = byId.get(id)
            if (!e) return null
            return (
              <tr key={id} className="border-b border-slate-100">
                <td className={td}>
                  <input key={`${id}-${i}`} defaultValue={i + 1} inputMode="numeric" className="border border-slate-300 px-1 py-0.5 w-12 text-sm"
                    onKeyDown={ev => { if (ev.key === 'Enter') { const n = Number((ev.target as HTMLInputElement).value); if (n) move(i, n - 1) } }}
                    onBlur={ev => { const n = Number(ev.target.value); if (n && n !== i + 1) move(i, n - 1) }} />
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <button onClick={() => move(i, 0)} disabled={i === 0} className="px-1 text-slate-500 hover:text-black disabled:opacity-20" title="To the top">⤒</button>
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} className="px-1 text-slate-500 hover:text-black disabled:opacity-20" title="Up">▲</button>
                  <button onClick={() => move(i, i + 1)} disabled={i === ids.length - 1} className="px-1 text-slate-500 hover:text-black disabled:opacity-20" title="Down">▼</button>
                </td>
                {list === 'overall' && <td className={td}>{e.weight}</td>}
                <td className={`${td} font-medium`}><Link href={`/admin/${side}/wrestlers/${id}`} className="hover:underline">{e.name}</Link></td>
                <td className={td}>{e.school}</td>
                <td className={td}>{e.class_year}</td>
                <td className={`${td} text-slate-600`}>{e.best_result ?? '—'}</td>
                <td className={`${td} tabular-nums text-slate-500`}>{e.score}</td>
                {list === 'overall' && <td className={td}><button onClick={() => { setIds(ids.filter(x => x !== id)); setDirty(true); setMsg(null) }} className="text-xs text-slate-400 hover:text-red-600">Take off</button></td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
