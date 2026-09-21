'use client'

import { useEffect, useState } from 'react'
import type { PastSeason } from '../PastSeasonsClient'
import { parseStandingsText, type ParsedBlock } from '@/lib/parseStandings'

type Conference = { slug: string; name: string }
type Alternate  = { schoolId: number; displayName: string; isOos?: boolean }
type Match      = { schoolId: number | null; displayName: string | null; confidence: string; alternates: Alternate[] }
type RowState   = { include: boolean; schoolId: number | null; schoolName: string | null; manual: boolean; match: Match | null }
type BlockState = {
  block: ParsedBlock
  rows: RowState[]
  conferenceSlug: string
  status: 'idle' | 'saving' | 'done' | 'error'
  message: string | null
}

const TH = 'px-3 py-1 text-left text-xs font-bold uppercase tracking-wide text-slate-500'
const TD = 'px-3 py-1'

function guessConference(label: string, conferences: Conference[]): string {
  const norm     = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const initials = (s: string) => s.split(/[\s-]+/).filter(w => !['of', 'the'].includes(w.toLowerCase())).map(w => w[0]).join('').toLowerCase()
  const target   = norm(label)
  const hit = conferences.find(c =>
    norm(c.name) === target ||
    (target.length > 3 && norm(c.name).startsWith(target)) ||
    initials(c.name) === target,
  )
  return hit?.slug ?? ''
}

function SchoolPicker({ row, onPick }: { row: RowState; onPick: (id: number, name: string) => void }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<{ id: number; display_name: string }[]>([])
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) return
    let cancelled = false
    fetch(`/api/admin/search-schools?q=${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setResults(d.schools ?? []) })
      .catch(() => { if (!cancelled) setResults([]) })
    return () => { cancelled = true }
  }, [query])

  if (row.schoolId && !editing) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-slate-800">{row.schoolName}</span>
        <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-slate-600">change</button>
      </span>
    )
  }

  const suggestions = (row.match?.alternates ?? []).filter(a => !a.isOos).slice(0, 3)

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search schools…"
        className="border border-slate-200 rounded px-2 py-0.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
      />
      {query.trim().length < 2 && suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestions.map(a => (
            <button
              key={a.schoolId}
              onClick={() => { onPick(a.schoolId, a.displayName); setEditing(false) }}
              className="text-xs px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              {a.displayName}?
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 2 && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-56 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg">
          {results.map(s => (
            <li key={s.id}>
              <button
                onClick={() => { onPick(s.id, s.display_name); setQuery(''); setResults([]); setEditing(false) }}
                className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StandingsTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'

  const [conferences, setConferences]       = useState<Conference[]>([])
  const [existingCounts, setExistingCounts] = useState<Record<string, number>>({})
  const [loadError, setLoadError]           = useState<string | null>(null)
  const [reloadKey, setReloadKey]           = useState(0)

  const [raw, setRaw]             = useState('')
  const [parsing, setParsing]     = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [warnings, setWarnings]   = useState<string[]>([])
  const [blocks, setBlocks]       = useState<BlockState[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/past-seasons/standings?seasonId=${season.id}&gender=${gender}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
        if (!cancelled) { setConferences(d.conferences ?? []); setExistingCounts(d.existingCounts ?? {}); setLoadError(null) }
      })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [season.id, gender, reloadKey])

  async function handleParse() {
    setParseError(null)
    setBlocks([])
    const { blocks: parsed, warnings: w } = parseStandingsText(raw)
    setWarnings(w)
    if (parsed.length === 0) { setParseError('Nothing to import. Paste the table including its title line.'); return }

    setParsing(true)
    try {
      const names = [...new Set(parsed.flatMap(b => b.rows.map(r => r.team)))]
      const res   = await fetch('/api/admin/match-schools', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, gender, seasonId: season.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      const byName = new Map<string, Match>()
      names.forEach((n, i) => byName.set(n, json.results[i]))

      setBlocks(parsed.map(block => ({
        block,
        conferenceSlug: block.kind === 'standings' ? guessConference(block.conference, conferences) : '',
        status: 'idle',
        message: null,
        rows: block.rows.map(r => {
          const m    = byName.get(r.team) ?? null
          const auto = !!m && m.schoolId !== null && (m.confidence === 'exact' || m.confidence === 'high')
          return { include: true, schoolId: auto ? m!.schoolId : null, schoolName: auto ? m!.displayName : null, manual: false, match: m }
        }),
      })))
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e))
    } finally {
      setParsing(false)
    }
  }

  function patchBlock(i: number, patch: Partial<BlockState>) {
    setBlocks(bs => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }

  function patchRow(i: number, ri: number, patch: Partial<RowState>) {
    setBlocks(bs => bs.map((b, idx) => (idx === i
      ? { ...b, rows: b.rows.map((r, rIdx) => (rIdx === ri ? { ...r, ...patch } : r)) }
      : b)))
  }

  async function importBlock(i: number) {
    const bs = blocks[i]
    const chosen = bs.block.rows.map((r, ri) => ({ r, s: bs.rows[ri] })).filter(x => x.s.include)
    patchBlock(i, { status: 'saving', message: null })

    const rows = chosen.map(({ r, s }) => {
      if (bs.block.kind === 'standings') {
        const sr = r as Extract<ParsedBlock, { kind: 'standings' }>['rows'][number]
        return {
          schoolId: s.schoolId, schoolName: sr.team, division: sr.division,
          overallWins: sr.overallWins, overallLosses: sr.overallLosses,
          divWins: sr.divWins, divLosses: sr.divLosses, pf: sr.pf, pa: sr.pa,
        }
      }
      const pr = r as Extract<ParsedBlock, { kind: 'power_points' }>['rows'][number]
      return { schoolId: s.schoolId, wins: pr.wins, losses: pr.losses, pp: pr.pp }
    })

    try {
      const res = await fetch('/api/admin/past-seasons/standings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: bs.block.kind, seasonId: season.id, gender,
          conferenceSlug: bs.conferenceSlug || undefined, rows, rawText: raw,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

      const manual = chosen.filter(({ s }) => s.manual && s.schoolId)
      await Promise.allSettled(manual.map(({ r, s }) =>
        fetch('/api/admin/add-school-alias', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id: s.schoolId, alias: r.team, alias_type: 'abbreviation' }),
        })))

      patchBlock(i, {
        status: 'done',
        message: `Imported ${json.imported} rows`
          + (json.replaced ? `, replaced ${json.replaced} existing` : '')
          + (json.frozenKept ? `. ${json.frozenKept} still show their frozen PP until unfrozen` : '.'),
      })
      setReloadKey(k => k + 1)
    } catch (e) {
      patchBlock(i, { status: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="max-w-5xl">
      <p className="text-sm font-semibold text-slate-700 mb-1">Standings &amp; Power Points — {genderLabel} {season.year_label}</p>
      <p className="text-xs text-slate-400 mb-4">
        Paste conference standings or Power Points exactly as copied from nj.com, including the title line
        (e.g. &ldquo;2025-2026 BCSL Standings&rdquo;). Several tables can be pasted together. Importing a conference
        replaces its existing {genderLabel.toLowerCase()} standings for this season.
      </p>

      {loadError && (
        <p className="text-sm text-red-600 mb-3">Could not load conferences: {loadError}</p>
      )}

      <textarea
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={10}
        spellCheck={false}
        placeholder={'2025-2026 BCSL Standings\nFreedom    OVERALL    PCT    DIV    PCT    HOME    AWAY    PF    PA\nMaple Shade    12-15    .444    4-0    1.000    7-9    5-6    1096    935\n…'}
        className="w-full border border-slate-200 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
      />
      <div className="mt-2 mb-6 flex items-center gap-3">
        <button
          onClick={handleParse}
          disabled={parsing || raw.trim() === ''}
          className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40"
        >
          {parsing ? 'Reading…' : 'Read pasted data'}
        </button>
        {parseError && <span className="text-sm text-red-600">{parseError}</span>}
      </div>

      {warnings.length > 0 && (
        <div className="mb-6 border border-amber-200 bg-amber-50 rounded px-3 py-2 text-xs text-amber-800">
          <p className="font-semibold mb-1">{warnings.length} line{warnings.length === 1 ? '' : 's'} could not be read</p>
          <ul className="list-disc pl-4">
            {warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
            {warnings.length > 8 && <li>…and {warnings.length - 8} more</li>}
          </ul>
        </div>
      )}

      {blocks.map((bs, i) => {
        const b            = bs.block
        const included     = bs.rows.filter(r => r.include)
        const unresolved   = included.filter(r => !r.schoolId).length
        const ids          = included.map(r => r.schoolId).filter((v): v is number => v !== null)
        const duplicates   = ids.length - new Set(ids).size
        const yearMismatch = b.endYear !== season.end_year
        const needsConf    = b.kind === 'standings' && !bs.conferenceSlug
        const blocked      = yearMismatch || needsConf || unresolved > 0 || duplicates > 0 || included.length === 0 || bs.status === 'saving' || bs.status === 'done'
        const existing     = b.kind === 'standings' && bs.conferenceSlug ? existingCounts[bs.conferenceSlug] ?? 0 : 0

        return (
          <div key={i} className="mb-8 border border-slate-200 rounded">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">{b.title}</span>
              {b.kind === 'standings' && (
                <select
                  value={bs.conferenceSlug}
                  onChange={e => patchBlock(i, { conferenceSlug: e.target.value })}
                  className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="">Choose conference…</option>
                  {conferences.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              )}
              {existing > 0 && <span className="text-xs text-amber-700">Replaces {existing} existing rows</span>}
            </div>

            {yearMismatch && (
              <p className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">
                This paste is for {b.endYear - 1}-{String(b.endYear).slice(-2)} but you are importing into {season.year_label}. Switch the season above or paste the correct table.
              </p>
            )}

            <table className="w-full text-xs">
              <thead className="bg-white">
                <tr>
                  <th className={TH} />
                  <th className={TH}>{b.kind === 'standings' ? 'Division' : 'Rank'}</th>
                  <th className={TH}>Pasted name</th>
                  <th className={TH}>School</th>
                  <th className={`${TH} text-right`}>Record</th>
                  {b.kind === 'standings' && <th className={`${TH} text-right`}>Div</th>}
                  {b.kind === 'standings' && <th className={`${TH} text-right`}>PF</th>}
                  {b.kind === 'standings' && <th className={`${TH} text-right`}>PA</th>}
                  {b.kind === 'power_points' && <th className={`${TH} text-right`}>PP</th>}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => {
                  const s = bs.rows[ri]
                  return (
                    <tr key={ri} className={`border-t border-slate-100 ${s.include ? '' : 'opacity-40'}`}>
                      <td className={TD}>
                        <input type="checkbox" checked={s.include} onChange={e => patchRow(i, ri, { include: e.target.checked })} />
                      </td>
                      {b.kind === 'standings'
                        ? <td className={TD}>{(r as { division: string }).division}</td>
                        : <td className={`${TD} tabular-nums`}>{(r as { rank: number }).rank}</td>}
                      <td className={TD}>{r.team}</td>
                      <td className={TD}>
                        <SchoolPicker row={s} onPick={(id, name) => patchRow(i, ri, { schoolId: id, schoolName: name, manual: true })} />
                      </td>
                      {b.kind === 'standings' ? (
                        <>
                          <td className={`${TD} text-right tabular-nums`}>{(r as { overallWins: number }).overallWins}-{(r as { overallLosses: number }).overallLosses}</td>
                          <td className={`${TD} text-right tabular-nums`}>{(r as { divWins: number | null }).divWins ?? '—'}-{(r as { divLosses: number | null }).divLosses ?? '—'}</td>
                          <td className={`${TD} text-right tabular-nums`}>{(r as { pf: number | null }).pf ?? '—'}</td>
                          <td className={`${TD} text-right tabular-nums`}>{(r as { pa: number | null }).pa ?? '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className={`${TD} text-right tabular-nums`}>{(r as { wins: number }).wins}-{(r as { losses: number }).losses}</td>
                          <td className={`${TD} text-right tabular-nums`}>{(r as { pp: number }).pp}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center gap-3">
              <button
                onClick={() => importBlock(i)}
                disabled={blocked}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40"
              >
                {bs.status === 'saving' ? 'Importing…' : `Import ${included.length} rows`}
              </button>
              {unresolved > 0 && <span className="text-xs text-amber-700">{unresolved} school{unresolved === 1 ? '' : 's'} still to match (or uncheck the row)</span>}
              {duplicates > 0 && <span className="text-xs text-red-700">The same school is matched to more than one row</span>}
              {needsConf && <span className="text-xs text-amber-700">Choose the conference</span>}
              {bs.message && <span className={`text-xs ${bs.status === 'error' ? 'text-red-600' : 'text-green-700'}`}>{bs.message}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
