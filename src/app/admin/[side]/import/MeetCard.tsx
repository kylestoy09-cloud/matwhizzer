'use client'

import { Fragment, useState, useEffect } from 'react'
import type { ParsedMeet, ParsedMatch } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
  resolveSchool,
  resolveWrestler,
  isPlaceholderName,
} from './types'

// ── School roster type (mirrors API response) ──────────────────────────────────

type SchoolWrestler = {
  wrestlerId:  string
  displayName: string
  weights:     number[]
}

// ── School roster dropdown ─────────────────────────────────────────────────────

function SchoolRosterDropdown({
  schoolId,
  panelKey,
  override,
  gender,
  onSelect,
}: {
  schoolId:  number | null
  panelKey:  WrestlerKey
  override:  WrestlerOverride | undefined
  gender:    'M' | 'F'
  onSelect:  (wrestlerId: string, displayName: string) => void
}) {
  const [query,   setQuery]   = useState('')
  const [roster,  setRoster]  = useState<SchoolWrestler[]>([])
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (!schoolId) { setRoster([]); return }
    setLoading(true)
    setErr(null)
    fetch(`/api/admin/school-wrestlers?schoolId=${schoolId}&gender=${gender}`)
      .then(r => r.json())
      .then(j => setRoster(j.wrestlers ?? []))
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [schoolId, gender])

  // Caller controls visibility when schoolId is null — don't render empty state here
  if (!schoolId) return null
  if (loading) return <p className="text-xs text-slate-400 italic mb-3">Loading roster…</p>
  if (err)     return <p className="text-xs text-red-500 italic mb-3">Failed to load roster.</p>

  const filtered = query.trim()
    ? roster.filter(w => w.displayName.toLowerCase().includes(query.toLowerCase()))
    : roster

  return (
    <div className="mb-3">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search roster by name…"
        autoFocus
        className="w-full text-xs border border-black/30 px-2 py-1 outline-none focus:border-black mb-2"
      />
      <div className="max-h-44 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            {roster.length === 0 ? 'No wrestlers on file for this school.' : 'No matches for your search.'}
          </p>
        ) : (
          filtered.map(w => (
            <label key={w.wrestlerId} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`wrestler-roster-${panelKey}`}
                checked={!override?.confirmedNew && override?.wrestlerId === w.wrestlerId}
                onChange={() => onSelect(w.wrestlerId, w.displayName)}
                className="accent-black"
              />
              <span className="text-xs text-slate-800">{w.displayName}</span>
              <span className="text-xs text-slate-400">{w.weights.join(', ')}</span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

// ── Inline wrestler review panel ───────────────────────────────────────────────
// Rendered as a table row below the match row. Extracted into a component so
// it can hold its own state for the team-school picker.

function InlineWrestlerPanel({
  rawName, rawSchool, weightClass,
  panelKey, activeSchoolId, teamSchools,
  wMatch, override, gender,
  onOverride, onClose,
}: {
  rawName:        string | null
  rawSchool:      string | null
  weightClass:    number
  panelKey:       WrestlerKey
  activeSchoolId: number | null
  teamSchools:    { id: number; name: string }[]
  wMatch:         WrestlerMatch | undefined
  override:       WrestlerOverride | undefined
  gender:         'M' | 'F'
  onOverride:     (key: WrestlerKey, o: WrestlerOverride | null) => void
  onClose:        () => void
}) {
  const [localSchoolId, setLocalSchoolId] = useState<number | null>(activeSchoolId)

  // If parent resolves the school (e.g. via school override), sync up
  useEffect(() => { setLocalSchoolId(activeSchoolId) }, [activeSchoolId])

  const effectiveSchoolId = localSchoolId
  const alternates        = wMatch?.alternates ?? []
  const isConfirmedNew    = override?.confirmedNew === true
  const needsTeamPick     = activeSchoolId === null
  const showTeamPicker    = needsTeamPick && teamSchools.length > 0
  const canConfirm        = !showTeamPicker || effectiveSchoolId !== null

  return (
    <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">

      {/* Header + close */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold text-slate-700">
          <span className="font-mono">{rawName}</span>
          {rawSchool && (
            <span className="text-slate-400 font-normal ml-1">({rawSchool})</span>
          )}
          <span className="text-slate-400 font-normal ml-2">{weightClass}lb</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-sm leading-none ml-4 shrink-0"
          aria-label="Close"
        >×</button>
      </div>

      {/* Team picker — shown when school couldn't be resolved */}
      {showTeamPicker && (
        <div className="mb-3">
          <p className="text-[11px] font-medium text-slate-500 mb-1.5">Which team is this wrestler on?</p>
          <div className="flex flex-wrap gap-2">
            {teamSchools.map(t => (
              <button
                key={t.id}
                onClick={() => setLocalSchoolId(t.id)}
                className={`text-xs px-2.5 py-1 border transition-colors ${
                  localSchoolId === t.id
                    ? 'border-black bg-black text-white'
                    : 'border-slate-300 hover:border-black text-slate-700'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alternates or full roster search */}
      {alternates.length > 0 ? (
        <div className="space-y-1.5 mb-3">
          {alternates.map(alt => (
            <label key={alt.wrestlerId} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`wrestler-inline-${panelKey}`}
                checked={!isConfirmedNew && override?.wrestlerId === alt.wrestlerId}
                onChange={() => onOverride(panelKey, {
                  wrestlerId:   alt.wrestlerId,
                  displayName:  alt.displayName,
                  confirmedNew: false,
                })}
                className="accent-black"
              />
              <span className="text-xs text-slate-800">{alt.displayName}</span>
              <span className="text-xs text-slate-400">{(alt.score * 100).toFixed(0)}%</span>
            </label>
          ))}
        </div>
      ) : (
        // Show roster search once a school is available
        canConfirm && (
          <SchoolRosterDropdown
            schoolId={effectiveSchoolId}
            panelKey={panelKey}
            override={override}
            gender={gender}
            onSelect={(wrestlerId, displayName) =>
              onOverride(panelKey, { wrestlerId, displayName, confirmedNew: false })
            }
          />
        )
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {canConfirm ? (
          <button
            onClick={() => onOverride(
              panelKey,
              isConfirmedNew ? null : { wrestlerId: null, displayName: null, confirmedNew: true },
            )}
            className={`text-xs px-3 py-1 border ${
              isConfirmedNew
                ? 'border-slate-300 bg-slate-100 text-slate-500'
                : 'border-black bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            {isConfirmedNew ? '✓ New wrestler — Undo' : 'Confirm as New Wrestler'}
          </button>
        ) : (
          <p className="text-[11px] text-slate-400 italic">Pick a team above before confirming.</p>
        )}
        {override && !isConfirmedNew && (
          <button
            onClick={() => onOverride(panelKey, null)}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
          >
            Clear
          </button>
        )}
      </div>

    </div>
  )
}

// ── Confidence badge ───────────────────────────────────────────────────────────

const BADGE_STYLE: Record<string, string> = {
  exact: 'bg-green-100  text-green-800',
  high:  'bg-yellow-100 text-yellow-800',
  low:   'bg-orange-100 text-orange-800',
  none:  'bg-red-100    text-red-700',
}

const BADGE_LABEL: Record<string, string> = {
  exact: '✓ Exact',
  high:  '~ High',
  low:   '? Low',
  none:  '? None',
}

function ConfidenceDot({ confidence, title }: { confidence: string; title?: string }) {
  return (
    <span
      className={`inline-flex items-center shrink-0 rounded px-1 py-px text-[10px] font-semibold leading-none ${BADGE_STYLE[confidence] ?? 'bg-slate-100 text-slate-600'}`}
      title={title ?? confidence}
    >
      {BADGE_LABEL[confidence] ?? confidence}
    </span>
  )
}

// ── Wrestler cell ──────────────────────────────────────────────────────────────

function WrestlerCell({
  name,
  schoolRaw,
  wKey,
  resolutions,
  overrides,
  onClick,
  isOos,
}: {
  name:        string | null
  schoolRaw:   string | null
  wKey:        string
  resolutions: Record<string, WrestlerMatch>
  overrides:   Record<string, WrestlerOverride>
  onClick?:    () => void
  isOos?:      boolean
}) {
  if (!name) return <span className="text-slate-400 text-xs">—</span>
  if (isPlaceholderName(name)) return <span className="text-slate-400 text-xs italic">{name}</span>

  if (isOos) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <span className="text-xs text-slate-800 truncate">{name}</span>
        {schoolRaw && <span className="text-[11px] text-slate-400 shrink-0">({schoolRaw})</span>}
        <span className="inline-flex items-center rounded px-1 py-px text-[10px] font-semibold leading-none bg-blue-50 text-blue-600 border border-blue-200 shrink-0">OOS</span>
      </div>
    )
  }

  const resolved    = resolveWrestler(wKey, resolutions, overrides)
  // All non-exact, non-OOS wrestlers are clickable so the inline panel is
  // accessible for new wrestlers too (not just low/none confidence).
  const isClickable = !!onClick && (resolved.isNew || resolved.confidence === 'low' || resolved.confidence === 'none')

  const inner = (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      {!resolved.isNew && (
        <ConfidenceDot confidence={resolved.confidence} title={`Wrestler: ${resolved.confidence}`} />
      )}
      <span className="text-xs text-slate-800 truncate">{name}</span>
      {schoolRaw && (
        <span className="text-[11px] text-slate-400 shrink-0">({schoolRaw})</span>
      )}
      {resolved.isNew && (
        <span className="text-[10px] font-bold px-1 py-0.5 bg-red-100 text-red-700 border border-red-300 shrink-0">
          NEW
        </span>
      )}
      {resolved.isNew && override_confirmedNew(wKey, overrides) && (
        <span className="text-[10px] font-bold px-1 py-0.5 bg-slate-100 text-slate-500 border border-slate-300 shrink-0">
          ✓
        </span>
      )}
    </div>
  )

  if (isClickable) {
    return (
      <button onClick={onClick} className="text-left w-full hover:bg-amber-50 -mx-1 px-1 rounded">
        {inner}
      </button>
    )
  }
  return inner
}

function override_confirmedNew(key: string, overrides: Record<string, WrestlerOverride>): boolean {
  return overrides[key]?.confirmedNew === true
}

// ── Result cell ────────────────────────────────────────────────────────────────

function ResultCell({ m }: { m: ParsedMatch }) {
  if (m.isDoubleForfeit) return <span className="text-xs text-slate-400 italic">Double Forfeit</span>
  if (m.isForfeitWin)    return <span className="text-xs text-slate-500">Forfeit</span>
  const detail = m.resultDetail ? ` ${m.resultDetail}` : ''
  return <span className="text-xs text-slate-700">{m.resultType}{detail}</span>
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  meet:                 ParsedMeet
  schoolResolutions:    Record<string, SchoolMatch>
  schoolOverrides:      Record<string, SchoolOverride>
  wrestlerResolutions:  Record<string, WrestlerMatch>
  wrestlerOverrides:    Record<string, WrestlerOverride>
  skip:                 boolean
  gender:               'M' | 'F'
  onSkipChange:         (skip: boolean) => void
  onWrestlerOverride:   (key: WrestlerKey, o: WrestlerOverride | null) => void
}

// ── MeetCard ───────────────────────────────────────────────────────────────────

export function MeetCard({
  meet,
  schoolResolutions,
  schoolOverrides,
  wrestlerResolutions,
  wrestlerOverrides,
  skip,
  gender,
  onSkipChange,
  onWrestlerOverride,
}: Props) {
  const [expanded,          setExpanded]          = useState(!meet.isDuplicate)
  const [activeWrestlerKey, setActiveWrestlerKey] = useState<string | null>(null)

  const s1 = resolveSchool(meet.team1Name, schoolResolutions, schoolOverrides)
  const s2 = resolveSchool(meet.team2Name, schoolResolutions, schoolOverrides)

  // Team schools for the inline team picker (used when a wrestler's school is null)
  const teamSchools = [
    s1.schoolId !== null && !s1.isOutOfState ? { id: s1.schoolId, name: s1.displayName ?? meet.team1Name } : null,
    s2.schoolId !== null && !s2.isOutOfState ? { id: s2.schoolId, name: s2.displayName ?? meet.team2Name } : null,
  ].filter((t): t is { id: number; name: string } => t !== null)

  // Per-match stats (OOS wrestlers excluded)
  const matchRows = meet.matches.filter(m => !m.isDoubleForfeit)
  let exact = 0, newW = 0, review = 0
  for (const m of matchRows) {
    for (const [name, schoolRaw] of [
      [m.winnerName, m.winnerSchoolRaw] as const,
      ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as const] : []),
    ]) {
      if (!name || isPlaceholderName(name)) continue
      const schoolRes = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides)
      if (schoolRes.isOutOfState) continue
      const key = makeWrestlerKey(name, schoolRes.schoolId, m.weightClass)
      const resolved = resolveWrestler(key, wrestlerResolutions, wrestlerOverrides)
      if (resolved.isNew)                       newW++
      else if (resolved.confidence === 'exact') exact++
      else if (resolved.confidence === 'low')   review++
    }
  }

  function toggleWrestler(key: string) {
    setActiveWrestlerKey(prev => prev === key ? null : key)
  }

  // Confirm all new wrestlers in this meet that have a known school
  function confirmAllNew() {
    for (const m of meet.matches) {
      if (m.isDoubleForfeit) continue
      const pairs: [string | null, string | null][] = [
        [m.winnerName, m.winnerSchoolRaw],
        ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as [string | null, string | null]] : []),
      ]
      for (const [name, schoolRaw] of pairs) {
        if (!name || isPlaceholderName(name)) continue
        const sr = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides)
        if (sr.isOutOfState || sr.schoolId === null) continue
        const key = makeWrestlerKey(name, sr.schoolId, m.weightClass)
        const resolved = resolveWrestler(key, wrestlerResolutions, wrestlerOverrides)
        if (resolved.isNew && !wrestlerOverrides[key]) {
          onWrestlerOverride(key, { wrestlerId: null, displayName: null, confirmedNew: true })
        }
      }
    }
  }

  return (
    <div className={`border border-black bg-white ${skip ? 'opacity-50' : ''}`}>

      {/* ── Duplicate banner ──────────────────────────────────────────────────── */}
      {meet.isDuplicate && (
        <div className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 flex items-center justify-between">
          <span>DUPLICATE — already imported</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-white/80 hover:text-white ml-4"
          >
            {expanded ? 'Collapse ▲' : 'Expand ▼'}
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* School 1 */}
          <div className="flex items-center gap-1.5">
            <ConfidenceDot confidence={s1.confidence} title={`School: ${s1.confidence}`} />
            <span className="font-semibold text-sm text-slate-900">
              {s1.displayName ?? meet.team1Name}
            </span>
            {s1.isOutOfState && (
              <span className="inline-flex items-center rounded px-1 py-px text-[10px] font-semibold leading-none bg-blue-50 text-blue-600 border border-blue-200">OOS</span>
            )}
          </div>
          <span className="text-slate-400 text-sm shrink-0">vs.</span>
          {/* School 2 */}
          <div className="flex items-center gap-1.5">
            <ConfidenceDot confidence={s2.confidence} title={`School: ${s2.confidence}`} />
            <span className="font-semibold text-sm text-slate-900">
              {s2.displayName ?? meet.team2Name}
            </span>
            {s2.isOutOfState && (
              <span className="inline-flex items-center rounded px-1 py-px text-[10px] font-semibold leading-none bg-blue-50 text-blue-600 border border-blue-200">OOS</span>
            )}
          </div>
          <span className="text-slate-400 text-sm shrink-0 ml-1">({meet.date})</span>
          <span className="text-slate-500 text-sm ml-2 shrink-0">
            {meet.team1Score}–{meet.team2Score}
          </span>
        </div>

        {/* Skip + expand controls */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {!meet.isDuplicate && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              {expanded ? 'Collapse ▲' : 'Expand ▼'}
            </button>
          )}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skip}
              onChange={e => onSkipChange(e.target.checked)}
              className="accent-black w-3.5 h-3.5"
            />
            <span className="text-xs text-slate-600">Skip</span>
          </label>
        </div>
      </div>

      {/* ── Match table ───────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-black/10">
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-10 text-center">Bout</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-12">Wt</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">Winner</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">Loser</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-28">Result</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-16 text-center">Winner Pts</th>
              </tr>
            </thead>
            <tbody>
              {meet.matches.map((m, i) => {
                const winnerSchoolRes = resolveSchool(m.winnerSchoolRaw ?? '', schoolResolutions, schoolOverrides)
                const loserSchoolRes  = resolveSchool(m.loserSchoolRaw  ?? '', schoolResolutions, schoolOverrides)
                const winnerSchoolId  = winnerSchoolRes.schoolId
                const loserSchoolId   = loserSchoolRes.schoolId
                const winnerIsOos     = winnerSchoolRes.isOutOfState
                const loserIsOos      = loserSchoolRes.isOutOfState
                // OOS wrestlers get empty keys — no panel needed for them
                const wKey = m.winnerName && !winnerIsOos && !isPlaceholderName(m.winnerName)
                  ? makeWrestlerKey(m.winnerName, winnerSchoolId, m.weightClass)
                  : ''
                const lKey = m.loserName && !m.isForfeitWin && !m.isDoubleForfeit && !loserIsOos && !isPlaceholderName(m.loserName)
                  ? makeWrestlerKey(m.loserName, loserSchoolId, m.weightClass)
                  : ''

                // Which wrestler key (if any) has its panel open for this row?
                const panelKey = activeWrestlerKey === wKey && wKey ? wKey
                               : activeWrestlerKey === lKey && lKey ? lKey
                               : null

                return (
                  <Fragment key={i}>
                    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-xs font-mono text-slate-400 text-center">{i + 1}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-600">{m.weightClass}</td>

                      <td className="px-3 py-2">
                        {m.isDoubleForfeit
                          ? <span className="text-xs text-slate-400 italic">Double Forfeit</span>
                          : <WrestlerCell
                              name={m.winnerName}
                              schoolRaw={m.winnerSchoolRaw}
                              wKey={wKey}
                              resolutions={wrestlerResolutions}
                              overrides={wrestlerOverrides}
                              isOos={winnerIsOos}
                              onClick={wKey ? () => toggleWrestler(wKey) : undefined}
                            />
                        }
                      </td>

                      <td className="px-3 py-2">
                        {!m.isDoubleForfeit && (
                          <WrestlerCell
                            name={m.loserName}
                            schoolRaw={m.loserSchoolRaw}
                            wKey={lKey}
                            resolutions={wrestlerResolutions}
                            overrides={wrestlerOverrides}
                            isOos={loserIsOos}
                            onClick={lKey ? () => toggleWrestler(lKey) : undefined}
                          />
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <ResultCell m={m} />
                      </td>

                      <td className="px-3 py-2 text-xs text-center font-semibold text-slate-700 tabular-nums">
                        {m.isDoubleForfeit ? '0' : Math.max(m.team1Points, m.team2Points)}
                      </td>
                    </tr>

                    {panelKey && (
                      <tr>
                        <td colSpan={6} className="p-0 border-b border-slate-100">
                          <InlineWrestlerPanel
                            rawName={panelKey === wKey ? m.winnerName : m.loserName}
                            rawSchool={panelKey === wKey ? m.winnerSchoolRaw : m.loserSchoolRaw}
                            weightClass={m.weightClass}
                            panelKey={panelKey as WrestlerKey}
                            activeSchoolId={panelKey === wKey ? winnerSchoolId : loserSchoolId}
                            teamSchools={teamSchools}
                            wMatch={wrestlerResolutions[panelKey]}
                            override={wrestlerOverrides[panelKey]}
                            gender={gender}
                            onOverride={onWrestlerOverride}
                            onClose={() => setActiveWrestlerKey(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Summary line ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-50 border-t border-black/10 flex flex-wrap gap-x-4 gap-y-1 items-center">
        <span className="text-[11px] text-slate-500">{meet.matches.length} matches</span>
        <span className="text-[11px] text-green-700">{exact} exact</span>
        {newW > 0 && (
          <>
            <span className="text-[11px] text-red-600">{newW} new wrestlers</span>
            <button
              onClick={confirmAllNew}
              className="text-[11px] text-red-700 hover:text-red-900 underline font-medium"
            >
              Confirm all as new
            </button>
          </>
        )}
        {review > 0 && <span className="text-[11px] text-orange-600">{review} need review</span>}
        {meet.isDuplicate && <span className="text-[11px] font-semibold text-red-600">DUPLICATE</span>}
      </div>
    </div>
  )
}
