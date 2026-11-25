'use client'

// Polls (Kyle 2026-11-12), under Articles: one list for the site (topic boys / girls / general), a question
// with its answers (any number, Kyle 2026-11-18) and the date it runs (12:00 AM – 11:59 PM Eastern). Signed-in fans vote once and then
// see percentages; the vote counts show here. Archived polls stay listed. "Sandbox copies" switches to the
// test polls the Challenge Sandbox page plays.
import { useCallback, useEffect, useState } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type Poll = { id: number; topic: 'boys' | 'girls' | 'general'; question: string; answers: string[]; poll_date: string | null; archived: boolean; votes: number[] }
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const TOPIC: Record<string, string> = { boys: 'Boys', girls: 'Girls', general: 'General' }

export function PollsClient() {
  const { loaded } = useAdminGender()
  const [sandbox, setSandbox] = useState(false)
  const [rows, setRows] = useState<Poll[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/admin/polls${sandbox ? '?sandbox=1' : ''}`).then(r => r.json()).then(d => d.error ? setError(d.error) : setRows(d.rows)).catch(() => setError('Could not load polls'))
  }, [sandbox])
  useEffect(() => { if (loaded) load() }, [load, loaded])

  async function archive(p: Poll) {
    const res = await fetch('/api/admin/polls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, archived: !p.archived }) })
    if (res.ok) load(); else setError((await res.json()).error)
  }

  const active = (rows ?? []).filter(p => !p.archived), archived = (rows ?? []).filter(p => p.archived)
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Articles · one list for boys and girls</p>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-bold text-slate-900">Polls</h1>
        <label className="ml-auto text-xs flex items-center gap-1 text-slate-600"><input type="checkbox" checked={sandbox} onChange={e => { setSandbox(e.target.checked); setRows(null) }} /> Sandbox copies</label>
      </div>
      <button onClick={() => setEditing('new')} className="px-3 py-1 text-sm bg-black text-white hover:bg-slate-800 mb-3">New poll</button>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {editing === 'new' && <PollForm sandbox={sandbox} onDone={() => { setEditing(null); load() }} />}
      {!rows ? <p className="text-sm text-slate-400">Loading…</p> : (
        <>
          {!active.length && editing !== 'new' && <p className="text-sm text-slate-400">No polls yet.</p>}
          <div className="space-y-2">
            {active.map(p => editing === p.id
              ? <PollForm key={p.id} sandbox={sandbox} poll={p} onDone={() => { setEditing(null); load() }} />
              : <PollCard key={p.id} p={p} onEdit={() => setEditing(p.id)} onArchive={() => archive(p)} />)}
          </div>
          <button onClick={() => setShowArchived(v => !v)} className="mt-8 text-sm font-semibold text-slate-800">{showArchived ? '▾' : '▸'} Archive ({archived.length})</button>
          {showArchived && <div className="space-y-2 mt-2">{archived.map(p => <PollCard key={p.id} p={p} onArchive={() => archive(p)} />)}</div>}
        </>
      )}
    </div>
  )
}

function PollCard({ p, onEdit, onArchive }: { p: Poll; onEdit?: () => void; onArchive: () => void }) {
  const total = p.votes.reduce((a, b) => a + b, 0)
  return (
    <div className={`border border-slate-200 px-4 py-3 ${p.archived ? 'bg-slate-50 text-slate-500' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-xs text-slate-400">{TOPIC[p.topic]} · {p.poll_date ? new Date(`${p.poll_date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'No date set'} · {total} vote{total === 1 ? '' : 's'}</p>
          <p className="font-medium text-sm">{p.question}</p>
          <ol className="text-sm list-decimal ml-5 mt-1">{p.answers.map((a, i) => <li key={i}>{a}{total > 0 && <span className="text-slate-400"> — {Math.round((p.votes[i] / total) * 1000) / 10}% ({p.votes[i]})</span>}</li>)}</ol>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {onEdit && <button onClick={onEdit} className="underline text-slate-500 hover:text-black">Edit</button>}
          <button onClick={onArchive} className="underline text-slate-500 hover:text-black">{p.archived ? 'Restore' : 'Archive'}</button>
        </div>
      </div>
    </div>
  )
}

function PollForm({ sandbox, poll, onDone }: { sandbox: boolean; poll?: Poll; onDone: () => void }) {
  const [f, setF] = useState({ topic: poll?.topic ?? 'boys', question: poll?.question ?? '', answers: poll?.answers ?? ['', ''], poll_date: poll?.poll_date ?? '' })
  const [err, setErr] = useState<string | null>(null)
  // any number of answers (Kyle 2026-11-18), at least one; a poll with votes keeps the answers it had (votes are by position)
  const locked = poll && poll.votes.some(n => n > 0) ? poll.answers.length : 0
  const ready = f.question.trim() && f.answers.length > 0 && f.answers.every(a => a.trim())
  async function save() {
    const res = await fetch('/api/admin/polls', { method: poll ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sandbox, ...(poll ? { id: poll.id } : {}), ...f }) })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onDone()
  }
  return (
    <div className="border border-slate-200 bg-slate-50 p-3 mb-3 space-y-2">
      <div className="flex gap-2 items-center">
        <select value={f.topic} onChange={e => setF({ ...f, topic: e.target.value as Poll['topic'] })} className={input}><option value="boys">Boys</option><option value="girls">Girls</option><option value="general">General</option></select>
        <label className="text-xs text-slate-500 flex items-center gap-2">Runs on <input type="date" value={f.poll_date} onChange={e => setF({ ...f, poll_date: e.target.value })} className={input} /></label>
      </div>
      <input value={f.question} onChange={e => setF({ ...f, question: e.target.value })} placeholder="Question" className={`${input} w-full`} />
      {f.answers.map((a, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input value={a} onChange={e => setF({ ...f, answers: f.answers.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Answer ${i + 1}`} className={`${input} w-full`} />
          {i >= locked
            ? <button onClick={() => setF({ ...f, answers: f.answers.filter((_, j) => j !== i) })} className="text-xs text-slate-500 underline hover:text-red-700" title="Remove this answer">Remove</button>
            : <span className="text-[10px] text-slate-400 whitespace-nowrap" title="This poll has votes — answers can be reworded, not removed">has votes</span>}
        </div>
      ))}
      <button onClick={() => setF({ ...f, answers: [...f.answers, ''] })} className="text-xs text-slate-600 underline hover:text-black">+ Add answer</button>
      <div className="flex gap-2 items-center">
        <button onClick={save} disabled={!ready} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Save</button>
        <button onClick={onDone} className="px-3 py-1 text-sm border border-slate-300">Cancel</button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  )
}
