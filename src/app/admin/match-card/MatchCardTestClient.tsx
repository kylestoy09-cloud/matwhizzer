'use client'

import { useState, useEffect } from 'react'
import { LiveScoringPanel } from './LiveScoringPanel'
import { logoFlipStyle } from '@/lib/logo-direction'

// ─── Types ─────────────────────────────────────────────────────────────────

type Phase = 'future' | 'scoring_soon' | 'live' | 'final'

type RawMeet = {
  id: string
  meet_date: string
  gender: string
  school_a: string
  school_b: string
  team1_score: number | null
  team2_score: number | null
  season_id: number
}

type Match = {
  id: string
  weight_class: string
  order_index: number
  result_type: string | null
  result_detail: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  is_forfeit_win: boolean
  is_double_forfeit: boolean
  team1_points: number | null
  team2_points: number | null
  wrestler_a_id: string | null
  wrestler_b_id: string | null
  wrestler_a_name: string | null
  wrestler_b_name: string | null
  school_a_id: string | null
  school_b_id: string | null
  school_a_logo: string | null
  school_b_logo: string | null
  winner_id: string | null
}

type SideType = { name: string | null; school: string; logo: string | null; school_id: number | null }

type MeetDetail = {
  meet: {
    id: string
    meet_date: string
    meet_time: string | null
    gender: string
    school_a: string
    school_b: string
    school_a_id: number | null
    school_b_id: number | null
    team1_score: number | null
    team2_score: number | null
    color_a: string | null
    color_b: string | null
    logo_a: string | null
    logo_b: string | null
    logo_dir_a: string | null
    logo_dir_b: string | null
  }
  matches: Match[]
}

type ScorecardEntry = {
  matchId: string
  winner: 'a' | 'b' | null
  resultType: string
}

type WrestlerOption = {
  id: string
  first_name: string
  last_name: string
}

type DirectMatch = {
  date: string
  event: string
  eventType: 'dual' | 'tournament' | 'postseason'
  winner: 'a' | 'b'
  resultType: string | null
  detail: string | null
  weightClass: string | null
}

type MatchDetail = {
  date: string
  event: string
  won: boolean
  resultType: string | null
  detail: string | null
}

type OpponentRecord = {
  opponent: { id: string; first_name: string; last_name: string; school_name: string | null }
  aWins: number
  aLosses: number
  bWins: number
  bLosses: number
  aMatches: MatchDetail[]
  bMatches: MatchDetail[]
}

type H2HData = {
  wrestlerA: { id: string; first_name: string; last_name: string }
  wrestlerB: { id: string; first_name: string; last_name: string }
  directMatches: DirectMatch[]
  commonOpponents: OpponentRecord[]
  prediction: {
    favoredWrestler: 'a' | 'b' | 'even'
    outcomeLabel: string
    score: number
    hammerA: number | null
    hammerB: number | null
  }
}

// ─── School color helper ──────────────────────────────────────────────────────

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
    h |= 0
  }
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 62%, 32%)`
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const RESULT_TYPES = ['DEC', 'MD', 'TF', 'FALL', 'FORFEIT', 'DBL-FORFEIT']

function resultPoints(rt: string): number {
  if (rt === 'DEC')     return 3
  if (rt === 'MD')      return 4
  if (rt === 'TF')      return 5
  if (rt === 'FALL')    return 6
  if (rt === 'FORFEIT') return 6
  return 0
}

function fmtDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(s: string) {
  return s.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

// ─── WinnerPoll ───────────────────────────────────────────────────────────────

function WinnerPoll({ schoolA, schoolB, phase, meetId }: {
  schoolA: string; schoolB: string; phase: Phase; meetId: string
}) {
  const key = `poll_${meetId}`
  const [vote, setVote] = useState<'a' | 'b' | null>(null)
  const [counts, setCounts] = useState({ a: 47, b: 31 })

  useEffect(() => {
    try { const v = localStorage.getItem(key); if (v === 'a' || v === 'b') setVote(v) } catch {}
  }, [key])

  const locked = phase === 'live' || phase === 'final'
  const total = counts.a + counts.b
  const pctA = Math.round(counts.a / total * 100)
  const pctB = 100 - pctA
  const revealed = vote !== null || locked

  function handleVote(side: 'a' | 'b') {
    if (locked || vote !== null) return
    setVote(side)
    setCounts(c => ({ ...c, [side]: c[side] + 1 }))
    try { localStorage.setItem(key, side) } catch {}
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="border-b border-slate-200 px-3 py-1 flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          {locked ? 'Fan Vote' : 'Fan Vote'}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex gap-2">
          {(['a', 'b'] as const).map(side => {
            const school = side === 'a' ? schoolA : schoolB
            const pct = side === 'a' ? pctA : pctB
            const isVoted = vote === side
            const canVote = !locked && vote === null
            return (
              <button
                key={side}
                onClick={() => handleVote(side)}
                disabled={locked || vote !== null}
                className={`flex-1 rounded border px-3 py-1.5 text-center transition-all ${
                  canVote
                    ? 'border-slate-300 hover:border-slate-600 cursor-pointer'
                    : isVoted
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 cursor-default'
                }`}
              >
                <p className="text-xs font-semibold text-slate-800 truncate">{school}</p>
                {revealed && (
                  <div className="mt-1 space-y-0.5">
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isVoted ? 'bg-blue-500' : 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] tabular-nums text-slate-500">{pct}%</p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {locked && <p className="text-[10px] text-center text-amber-600">Poll locked · match is {phase}</p>}
      </div>
    </div>
  )
}

// ─── WhizzerPrediction ────────────────────────────────────────────────────────

function predictedTeamPts(label: string): number {
  const l = label.toLowerCase()
  if (l.includes('pin') || l.includes('fall')) return 6
  if (l.includes('tech')) return 5
  if (l.includes('major')) return 4
  return 3
}

type BoutPredMap = Record<string, { winner: 'a' | 'b' | 'even'; label: string }>

function WhizzerPrediction({
  projA, projB, boutCount, tossups,
}: {
  projA: number; projB: number; boutCount: number; tossups: number
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="border-b border-slate-200 px-3 py-1 flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Whizzer Prediction</span>
      </div>
      <div className="px-4 py-2.5 text-center">
        {boutCount === 0 ? (
          <p className="text-xs text-slate-400 py-1">Loading H2H data…</p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-4">
              <span className="text-2xl font-black tabular-nums text-slate-900">{projA}</span>
              <span className="text-slate-300 font-bold">–</span>
              <span className="text-2xl font-black tabular-nums text-slate-900">{projB}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">
              {boutCount} bout{boutCount !== 1 ? 's' : ''} loaded
              {tossups > 0 ? ` · ${tossups} toss-up${tossups !== 1 ? 's' : ''} not counted` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── MatchHeader ──────────────────────────────────────────────────────────────

function SchoolLogoHeader({ logoUrl, direction, position, schoolName, bgColor }: {
  logoUrl: string | null; direction: string | null; position: 'away' | 'home'; schoolName: string; bgColor?: string | null
}) {
  const bg = bgColor ?? '#1e293b'
  if (logoUrl) {
    return (
      <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: bg }}>
        <img
          src={logoUrl}
          alt=""
          aria-hidden
          style={{ width: 48, height: 48, objectFit: 'contain', ...logoFlipStyle(direction as 'left' | 'right' | null, position) }}
        />
      </div>
    )
  }
  return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
      <span className="text-sm font-bold text-white">{initials(schoolName)}</span>
    </div>
  )
}

function MatchHeader({ meet, phase, isPremier, premierLabel, homeColor, boutPredictions }: {
  meet: MeetDetail['meet']; phase: Phase; isPremier: boolean; premierLabel: string; homeColor: string
  boutPredictions: BoutPredMap
}) {
  // Compute projected team scores from per-bout H2H predictions
  let projA = 0, projB = 0, boutCount = 0, tossups = 0
  for (const pred of Object.values(boutPredictions)) {
    boutCount++
    if (pred.winner === 'even') { tossups++; continue }
    const pts = predictedTeamPts(pred.label)
    if (pred.winner === 'a') projA += pts
    else projB += pts
  }
  return (
    <div className="border border-slate-200 bg-white rounded-lg overflow-hidden">
      {/* Home-team colored header bar — contains optional premier label + date */}
      <div
        className="px-5 py-3 text-center space-y-0.5"
        style={{ backgroundColor: homeColor }}
      >
        {isPremier && (
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <svg className="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              {premierLabel || 'Premier Dual'}
            </span>
            <svg className="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
        <p className="text-sm font-semibold text-white/90 tracking-wide">{fmtDate(meet.meet_date)}</p>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Phase badge */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-auto ${
            phase === 'future'        ? 'bg-slate-100 text-slate-500'
            : phase === 'scoring_soon' ? 'bg-blue-100 text-blue-700'
            : phase === 'live'         ? 'bg-green-100 text-green-700 animate-pulse'
            : 'bg-slate-800 text-white'
          }`}>
            {phase === 'future' ? 'Upcoming' : phase === 'scoring_soon' ? 'Scoring Open' : phase === 'live' ? '● Live' : 'Final'}
          </span>
        </div>

        {/* School matchup — logo above name */}
        <div className="flex items-center justify-between gap-6">
          {/* Away */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <SchoolLogoHeader logoUrl={meet.logo_a} direction={meet.logo_dir_a} position="away" schoolName={meet.school_a} bgColor={meet.color_a} />
            <div className="text-center min-w-0">
              <p className="font-bold text-slate-900 text-base leading-tight">{meet.school_a}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Away</p>
            </div>
          </div>

          {/* Score or vs */}
          <div className="shrink-0 text-center">
            {phase === 'final' && meet.team1_score != null && meet.team2_score != null ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black tabular-nums text-slate-900">{meet.team1_score}</span>
                <span className="text-slate-400 font-medium">–</span>
                <span className="text-3xl font-black tabular-nums text-slate-900">{meet.team2_score}</span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-slate-300">vs</span>
            )}
          </div>

          {/* Home */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <SchoolLogoHeader logoUrl={meet.logo_b} direction={meet.logo_dir_b} position="home" schoolName={meet.school_b} bgColor={meet.color_b} />
            <div className="text-center min-w-0">
              <p className="font-bold text-slate-900 text-base leading-tight">{meet.school_b}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Home</p>
            </div>
          </div>
        </div>

        {/* Whizzer Prediction — future phase only */}
        {phase === 'future' && (
          <WhizzerPrediction projA={projA} projB={projB} boutCount={boutCount} tossups={tossups} />
        )}

        {/* Fan Vote inner card */}
        {phase !== 'final' && (
          <WinnerPoll schoolA={meet.school_a} schoolB={meet.school_b} phase={phase} meetId={meet.id} />
        )}
      </div>
    </div>
  )
}

// ─── H2H Panel ────────────────────────────────────────────────────────────────

function H2HPanel({ match, nameA, nameB, meetId, gender, onPrediction }: {
  match: Match; nameA: string; nameB: string; meetId: string; gender: 'M' | 'F'
  onPrediction?: (winner: 'a' | 'b' | 'even', label: string) => void
}) {
  const [data, setData] = useState<H2HData | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!match.wrestler_a_id || !match.wrestler_b_id) return
    setLoading(true); setErr(null)
    const params = new URLSearchParams({ a: match.wrestler_a_id, b: match.wrestler_b_id, gender })
    if (meetId) params.set('exclude_meet', meetId)
    fetch(`/api/h2h?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
        if (d.prediction && onPrediction) onPrediction(d.prediction.favoredWrestler, d.prediction.outcomeLabel)
      })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [match.wrestler_a_id, match.wrestler_b_id, meetId])

  if (!match.wrestler_a_id || !match.wrestler_b_id)
    return <p className="text-xs text-slate-400 py-3 text-center">No wrestler IDs — H2H unavailable</p>
  if (loading) return <p className="text-xs text-slate-400 py-3">Loading H2H data…</p>
  if (err)     return <p className="text-xs text-red-500 py-3">{err}</p>
  if (!data)   return null

  const wA = data.wrestlerA
  const wB = data.wrestlerB
  const dm = data.directMatches
  const aH2HWins = dm.filter(m => m.winner === 'a').length
  const bH2HWins = dm.filter(m => m.winner === 'b').length
  const hasH2H = dm.length > 0

  // Directional bar: extends left if A leads, right if B leads
  const aLeads = aH2HWins > bH2HWins
  const bLeads = bH2HWins > aH2HWins
  const domPct = hasH2H ? Math.round(Math.max(aH2HWins, bH2HWins) / dm.length * 100) : 0

  // Color palette
  const navy    = '#0f2744'
  const navyBdr = '#1a3a6b'
  const blue0   = '#eff6ff'  // lightest row
  const blue1   = '#dbeafe'  // alternate row
  const blue2   = '#bfdbfe'  // column header tint

  return (
    <div style={{ border: `2px solid ${navyBdr}`, overflow: 'hidden', background: blue0 }}>

      {/* ── Whizzer Prediction banner ── */}
      <div style={{ background: navy, padding: '5px 12px', textAlign: 'center', borderBottom: `1px solid ${navyBdr}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#93c5fd' }}>
          Whizzer Prediction
        </span>
      </div>
      <div style={{ background: blue1, padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${navyBdr}` }}>
        {data.prediction ? (
          data.prediction.favoredWrestler === 'even' ? (
            <p style={{ fontSize: 12, fontWeight: 700, color: navy }}>Too close to call</p>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 800, color: navy }}>
                {data.prediction.favoredWrestler === 'a' ? wA.last_name : wB.last_name}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6', marginLeft: 6 }}>
                  {data.prediction.outcomeLabel}
                </span>
              </p>
            </>
          )
        ) : (
          <p style={{ fontSize: 11, color: '#64748b' }}>No prediction available</p>
        )}
      </div>

      {/* ── Previous Matchups banner ── */}
      <div style={{ background: navy, padding: '5px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderBottom: `1px solid ${navyBdr}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#93c5fd' }}>
          Previous Matchups
        </span>
        {hasH2H && (
          <span style={{ fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: aLeads ? '#ffffff' : '#60a5fa', fontWeight: aLeads ? 800 : 600 }}>{wA.last_name}</span>
            <span style={{ color: '#bfdbfe' }}>{aH2HWins}–{bH2HWins}</span>
            <span style={{ color: bLeads ? '#ffffff' : '#60a5fa', fontWeight: bLeads ? 800 : 600 }}>{wB.last_name}</span>
          </span>
        )}
      </div>

      {/* Dominance bar */}
      {hasH2H && (
        <div style={{ height: 4, background: blue2, display: 'flex' }}>
          {aLeads && <div style={{ width: `${domPct}%`, background: '#2563eb' }} />}
          {bLeads && <><div style={{ flex: 1 }} /><div style={{ width: `${domPct}%`, background: '#e11d48' }} /></>}
        </div>
      )}

      {/* Match rows */}
      {hasH2H ? (
        <div style={{ borderBottom: `1px solid ${navyBdr}` }}>
          {dm.map((m, i) => {
            const typeLabel = m.eventType === 'dual' ? 'Dual' : m.eventType === 'tournament' ? 'Tournament' : 'Postseason'
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', fontSize: 11, background: i % 2 === 0 ? blue0 : blue1, borderTop: i > 0 ? `1px solid ${blue2}` : 'none' }}>
                <div style={{ padding: '6px 10px' }}>
                  {m.winner === 'a' && <span style={{ fontWeight: 700, color: '#15803d' }}>W {m.resultType && <span style={{ fontSize: 10, background: '#dcfce7', padding: '1px 5px' }}>{m.resultType}{m.detail ? ` ${m.detail}` : ''}</span>}</span>}
                  {m.winner === 'b' && <span style={{ fontWeight: 700, color: '#be123c' }}>L</span>}
                </div>
                <div style={{ padding: '6px 10px', textAlign: 'center', minWidth: 110 }}>
                  <p style={{ fontSize: 10, color: '#475569' }}>{fmtShortDate(m.date)}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: navy }}>{typeLabel}</p>
                  {m.event && <p style={{ fontSize: 9, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{m.event}</p>}
                </div>
                <div style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {m.winner === 'b' && <span style={{ fontWeight: 700, color: '#15803d' }}>{m.resultType && <span style={{ fontSize: 10, background: '#dcfce7', padding: '1px 5px' }}>{m.resultType}{m.detail ? ` ${m.detail}` : ''}</span>} W</span>}
                  {m.winner === 'a' && <span style={{ fontWeight: 700, color: '#be123c' }}>L</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: blue0, padding: '12px', textAlign: 'center', borderBottom: `1px solid ${navyBdr}` }}>
          <p style={{ fontSize: 11, color: '#64748b' }}>No prior head-to-head matches</p>
        </div>
      )}

      {/* ── Common Opponents ── */}
      {data.commonOpponents.length > 0 && (
        <>
          <div style={{ background: navy, padding: '5px 12px', textAlign: 'center', borderBottom: `1px solid ${navyBdr}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#93c5fd' }}>
              Common Opponents ({data.commonOpponents.length})
            </span>
          </div>
          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', background: blue2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: navy, borderBottom: `1px solid ${navyBdr}` }}>
            <div style={{ padding: '5px 10px' }}>{wA.last_name}</div>
            <div style={{ padding: '5px 10px', minWidth: 110, textAlign: 'center' }}>Opponent</div>
            <div style={{ padding: '5px 10px', textAlign: 'right' }}>{wB.last_name}</div>
          </div>
          {data.commonOpponents.map((opp, i) => {
            const aLast = opp.aMatches.length > 0 ? opp.aMatches[opp.aMatches.length - 1] : null
            const bLast = opp.bMatches.length > 0 ? opp.bMatches[opp.bMatches.length - 1] : null
            return (
              <div key={opp.opponent.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', fontSize: 11, background: i % 2 === 0 ? blue0 : blue1, borderTop: `1px solid ${blue2}` }}>
                <div style={{ padding: '6px 10px' }}>
                  <p style={{ fontWeight: 700, color: navy }}>{opp.aWins}–{opp.aLosses}</p>
                  {aLast && <p style={{ fontSize: 10, color: aLast.won ? '#15803d' : '#be123c', marginTop: 2 }}>{aLast.won ? 'W' : 'L'}{aLast.resultType ? ` · ${aLast.resultType}` : ''} · {fmtShortDate(aLast.date)}</p>}
                </div>
                <div style={{ padding: '6px 10px', minWidth: 110, textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: navy }}>{opp.opponent.first_name} {opp.opponent.last_name}</p>
                  {opp.opponent.school_name && <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{opp.opponent.school_name}</p>}
                </div>
                <div style={{ padding: '6px 10px', textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: navy }}>{opp.bWins}–{opp.bLosses}</p>
                  {bLast && <p style={{ fontSize: 10, color: bLast.won ? '#15803d' : '#be123c', marginTop: 2 }}>{fmtShortDate(bLast.date)} · {bLast.resultType ? `${bLast.resultType} · ` : ''}{bLast.won ? 'W' : 'L'}</p>}
                </div>
              </div>
            )
          })}
          {/* ── Cumulative record footer ── */}
          {(() => {
            const totAW = data.commonOpponents.reduce((s, o) => s + o.aWins, 0)
            const totAL = data.commonOpponents.reduce((s, o) => s + o.aLosses, 0)
            const totBW = data.commonOpponents.reduce((s, o) => s + o.bWins, 0)
            const totBL = data.commonOpponents.reduce((s, o) => s + o.bLosses, 0)
            const aPct  = totAW + totAL > 0 ? totAW / (totAW + totAL) : 0
            const bPct  = totBW + totBL > 0 ? totBW / (totBW + totBL) : 0
            const aWins = aPct > bPct
            const bWins = bPct > aPct
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', background: navy, borderTop: `2px solid ${navyBdr}` }}>
                <div style={{ padding: '7px 10px' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: aWins ? '#ffffff' : '#60a5fa' }}>
                    {totAW}–{totAL}
                  </p>
                  <p style={{ fontSize: 9, color: '#93c5fd', marginTop: 1 }}>{wA.last_name}</p>
                </div>
                <div style={{ padding: '7px 10px', minWidth: 110, textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {aWins && (
                    <span style={{ fontSize: 18, color: '#fbbf24', display: 'inline-block', transform: 'rotate(-90deg)', lineHeight: 1, flexShrink: 0 }}>▲</span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#60a5fa' }}>Combined</span>
                  {bWins && (
                    <span style={{ fontSize: 18, color: '#fbbf24', display: 'inline-block', transform: 'rotate(90deg)', lineHeight: 1, flexShrink: 0 }}>▲</span>
                  )}
                </div>
                <div style={{ padding: '7px 10px', textAlign: 'right' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: bWins ? '#ffffff' : '#60a5fa' }}>
                    {totBW}–{totBL}
                  </p>
                  <p style={{ fontSize: 9, color: '#93c5fd', marginTop: 1 }}>{wB.last_name}</p>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ─── Scorecard Panel ──────────────────────────────────────────────────────────

function ScorecardPanel({ match, phase, entry, onChange }: {
  match: Match
  phase: Phase
  entry: ScorecardEntry
  onChange: (e: ScorecardEntry) => void
}) {
  const disabled = phase === 'future'
  const isForfeit = entry.resultType === 'FORFEIT' || entry.resultType === 'DBL-FORFEIT'

  if (disabled) {
    return <p className="text-xs text-slate-400 py-3">Scoring opens 1 hour before match time</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Result</p>
        <div className="flex flex-wrap gap-1.5">
          {RESULT_TYPES.map(rt => (
            <button
              key={rt}
              onClick={() => {
                let winner = entry.winner
                if (rt === 'DBL-FORFEIT') winner = null
                onChange({ ...entry, resultType: rt, winner })
              }}
              className={`px-2.5 py-1 text-xs font-medium border rounded transition-colors ${
                entry.resultType === rt
                  ? 'bg-black text-white border-black'
                  : 'border-slate-300 text-slate-600 hover:border-slate-600'
              }`}
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      {!isForfeit && entry.resultType && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Winner</p>
          <div className="flex gap-2">
            {(['a', 'b'] as const).map(side => {
              const name = side === 'a' ? (match.wrestler_a_name ?? 'Team A') : (match.wrestler_b_name ?? 'Team B')
              return (
                <button
                  key={side}
                  onClick={() => onChange({ ...entry, winner: side })}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${
                    entry.winner === side
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 text-slate-600 hover:border-slate-600'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {entry.resultType === 'FORFEIT' && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Forfeit Winner</p>
          <div className="flex gap-2">
            {(['a', 'b'] as const).map(side => {
              const name = side === 'a' ? (match.wrestler_a_name ?? 'Team A') : (match.wrestler_b_name ?? 'Team B')
              return (
                <button key={side} onClick={() => onChange({ ...entry, winner: side })}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${
                    entry.winner === side ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:border-slate-600'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BoutRow ──────────────────────────────────────────────────────────────────

function BoutRow({ match, phase, index, scorecardEntry, onScorecardChange, schoolA, schoolB, meetId, meetDate, meetTime, onBoutPrediction, isOpen, onToggle, onComplete, gender, colorA, colorB, dirA, dirB }: {
  match: Match
  phase: Phase
  index: number
  scorecardEntry: ScorecardEntry
  onScorecardChange: (e: ScorecardEntry) => void
  schoolA: string
  schoolB: string
  meetId: string
  meetDate: string
  meetTime: string | null
  onBoutPrediction: (matchId: string, winner: 'a' | 'b' | 'even', label: string) => void
  isOpen: boolean
  onToggle: () => void
  onComplete: (winner: 'a' | 'b', resultType: string) => void
  gender: string
  colorA?: string | null
  colorB?: string | null
  dirA?: string | null
  dirB?: string | null
}) {
  // Default to H2H; FAN SCORING tab only unlocks 15 min before match time (or 6 PM default)
  const isScoringOpen = (() => {
    const timeStr = meetTime ?? '18:00'
    const dt = new Date(`${meetDate}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`)
    return Date.now() >= dt.getTime() - 60 * 60 * 1000
  })()
  const [tab, setTab] = useState<'h2h' | 'scorecard'>('h2h')
  const [apiPrediction, setApiPrediction] = useState<{ winner: 'a' | 'b' | 'even'; label: string } | null>(null)

  // Wrestler override state
  const [overrideA, setOverrideA] = useState<string | null>(null) // null=default, 'forfeit', 'not_listed', or wrestlerId
  const [overrideB, setOverrideB] = useState<string | null>(null)
  const [wrestlersA, setWrestlersA] = useState<WrestlerOption[]>([])
  const [wrestlersB, setWrestlersB] = useState<WrestlerOption[]>([])

  useEffect(() => {
    if (!isOpen || !match.school_a_id || !match.weight_class) return
    fetch(`/api/admin/wrestlers-at-weight?school_id=${match.school_a_id}&weight_class=${match.weight_class}&gender=${gender}`)
      .then(r => r.json())
      .then(d => setWrestlersA(d.wrestlers ?? []))
      .catch(() => {})
  }, [isOpen, match.school_a_id, match.weight_class, gender])

  useEffect(() => {
    if (!isOpen || !match.school_b_id || !match.weight_class) return
    fetch(`/api/admin/wrestlers-at-weight?school_id=${match.school_b_id}&weight_class=${match.weight_class}&gender=${gender}`)
      .then(r => r.json())
      .then(d => setWrestlersB(d.wrestlers ?? []))
      .catch(() => {})
  }, [isOpen, match.school_b_id, match.weight_class, gender])

  // Effective wrestler IDs (for H2H re-query)
  const effectiveAId = overrideA === null ? match.wrestler_a_id
    : (overrideA === 'forfeit' || overrideA === 'not_listed') ? null
    : overrideA

  const effectiveBId = overrideB === null ? match.wrestler_b_id
    : (overrideB === 'forfeit' || overrideB === 'not_listed') ? null
    : overrideB

  const effectiveAName = overrideA === null ? match.wrestler_a_name
    : overrideA === 'forfeit' ? null
    : overrideA === 'not_listed' ? 'New Wrestler'
    : (() => { const w = wrestlersA.find(x => x.id === overrideA); return w ? `${w.first_name} ${w.last_name}` : match.wrestler_a_name })()

  const effectiveBName = overrideB === null ? match.wrestler_b_name
    : overrideB === 'forfeit' ? null
    : overrideB === 'not_listed' ? 'New Wrestler'
    : (() => { const w = wrestlersB.find(x => x.id === overrideB); return w ? `${w.first_name} ${w.last_name}` : match.wrestler_b_name })()

  const effectiveMatch: Match = { ...match, wrestler_a_id: effectiveAId, wrestler_b_id: effectiveBId }
  const isForfeit = overrideA === 'forfeit' || overrideB === 'forfeit'
  const forfeitWinner: 'a' | 'b' = overrideA === 'forfeit' ? 'b' : 'a'

  // Determine winner + result for display
  const actualWinner = match.winner_id === match.wrestler_a_id ? 'a'
    : match.winner_id === match.wrestler_b_id ? 'b'
    : null

  // Scorecard predicted winner (for future/scoring_soon)
  const predictedWinner = scorecardEntry.winner

  // Who to outline: actual winner in final, Whizzer prediction in future, scorecard in scoring phases
  const highlightA = phase === 'final' ? actualWinner === 'a'
    : phase === 'future' && apiPrediction ? apiPrediction.winner === 'a'
    : predictedWinner === 'a'
  const highlightB = phase === 'final' ? actualWinner === 'b'
    : phase === 'future' && apiPrediction ? apiPrediction.winner === 'b'
    : predictedWinner === 'b'

  const resultLabel = phase === 'final' && match.result_type ? match.result_type
    : phase === 'future' && apiPrediction ? apiPrediction.label
    : predictedWinner && scorecardEntry.resultType ? scorecardEntry.resultType
    : null

  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'

  return (
    <>
      <tr
        className={`${rowBg} hover:bg-blue-50/20 transition-colors cursor-pointer`}
        onClick={onToggle}
      >
        {/* Away wrestler (A) */}
        <td className={`px-3 py-2 text-xs text-center ${highlightA ? 'ring-inset ring-1 ring-blue-400 bg-blue-50/40' : ''}`}>
          <span className={`${highlightA ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
            {match.wrestler_a_name ?? <span className="text-slate-300">TBD</span>}
          </span>
          {highlightA && resultLabel && (
            <span className="ml-1.5 text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{resultLabel}</span>
          )}
        </td>

        {/* Weight class (center) */}
        <td className="px-2 py-2 text-xs font-semibold text-slate-400 text-center tabular-nums">{match.weight_class}</td>

        {/* Home wrestler (B) */}
        <td className={`px-3 py-2 text-xs text-center ${highlightB ? 'ring-inset ring-1 ring-blue-400 bg-blue-50/40' : ''}`}>
          <span className={`${highlightB ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
            {match.wrestler_b_name ?? <span className="text-slate-300">TBD</span>}
          </span>
          {highlightB && resultLabel && (
            <span className="ml-1.5 text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{resultLabel}</span>
          )}
          <span className="ml-2 text-[10px] text-slate-300">{isOpen ? '▾' : '▸'}</span>
        </td>
      </tr>

      {isOpen && (
        <tr className={rowBg}>
          <td colSpan={3} className="px-0 py-0">
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 space-y-3">

              {/* ── Wrestler Pickers ── */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {/* Side A */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{schoolA}</div>
                  <select
                    value={overrideA !== null ? overrideA : (match.wrestler_a_id ?? '__default__')}
                    onChange={e => {
                      const val = e.target.value
                      setOverrideA(val === (match.wrestler_a_id ?? '__default__') ? null : val)
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '100%', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', background: 'white', color: '#1e293b' }}
                  >
                    <option value={match.wrestler_a_id ?? '__default__'}>
                      {match.wrestler_a_name ?? 'No wrestler assigned'}
                    </option>
                    {wrestlersA.filter(w => w.id !== match.wrestler_a_id).map(w => (
                      <option key={w.id} value={w.id}>{w.last_name}, {w.first_name}</option>
                    ))}
                    <option disabled value="">──────</option>
                    <option value="forfeit">No Entry (Forfeit)</option>
                    <option value="not_listed">Wrestler Not Listed</option>
                  </select>
                </div>

                {/* Weight class center */}
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{match.weight_class}</span>
                </div>

                {/* Side B */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, textAlign: 'right' }}>{schoolB}</div>
                  <select
                    value={overrideB !== null ? overrideB : (match.wrestler_b_id ?? '__default__')}
                    onChange={e => {
                      const val = e.target.value
                      setOverrideB(val === (match.wrestler_b_id ?? '__default__') ? null : val)
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '100%', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', background: 'white', color: '#1e293b' }}
                  >
                    <option value={match.wrestler_b_id ?? '__default__'}>
                      {match.wrestler_b_name ?? 'No wrestler assigned'}
                    </option>
                    {wrestlersB.filter(w => w.id !== match.wrestler_b_id).map(w => (
                      <option key={w.id} value={w.id}>{w.last_name}, {w.first_name}</option>
                    ))}
                    <option disabled value="">──────</option>
                    <option value="forfeit">No Entry (Forfeit)</option>
                    <option value="not_listed">Wrestler Not Listed</option>
                  </select>
                </div>
              </div>

              {isForfeit ? (
                /* ── Forfeit confirmation ── */
                <div onClick={e => e.stopPropagation()} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 10 }}>
                    {overrideA === 'forfeit' ? schoolA : schoolB} has no entry
                    &nbsp;—&nbsp;Forfeit win for {overrideA === 'forfeit' ? schoolB : schoolA}
                  </p>
                  <button
                    onClick={() => onComplete(forfeitWinner, 'FORFEIT')}
                    style={{ padding: '6px 18px', fontSize: 12, fontWeight: 700, background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Confirm Forfeit
                  </button>
                </div>
              ) : (
                <>
                  {/* Tab bar */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
                    {/* H2H button — navy bg, light blue text */}
                    <button
                      onClick={e => { e.stopPropagation(); setTab('h2h') }}
                      style={{
                        padding: '6px 20px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 4,
                        border: 'none',
                        cursor: 'pointer',
                        background: tab === 'h2h' ? '#1e3a5f' : '#2d4f7a',
                        color: '#bfdbfe',
                        letterSpacing: '0.04em',
                        outline: tab === 'h2h' ? '2px solid #93c5fd' : 'none',
                      }}
                    >
                      HEAD-2-HEAD
                    </button>
                    {/* FAN SCORING button — only shown when scoring window is open */}
                    {isScoringOpen && (
                      <button
                        onClick={e => { e.stopPropagation(); setTab('scorecard') }}
                        style={{
                          padding: '6px 20px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                          background: tab === 'scorecard' ? '#000' : '#1c1c1c',
                          color: '#fbbf24',
                          letterSpacing: '0.04em',
                          outline: tab === 'scorecard' ? '2px solid #fbbf24' : 'none',
                        }}
                      >
                        FAN SCORING
                      </button>
                    )}
                  </div>

                  <div onClick={e => e.stopPropagation()}>
                    {tab === 'h2h' && (
                      <H2HPanel
                        key={`h2h-${effectiveAId ?? 'none'}-${effectiveBId ?? 'none'}`}
                        match={effectiveMatch}
                        nameA={schoolA}
                        nameB={schoolB}
                        meetId={meetId}
                        gender={gender === 'F' ? 'F' : 'M'}
                        onPrediction={phase === 'future' ? (w, l) => {
                          setApiPrediction({ winner: w, label: l })
                          onBoutPrediction(match.id, w, l)
                        } : undefined}
                      />
                    )}
                    {tab === 'scorecard' && (
                      <LiveScoringPanel
                        key={`scoring-${match.id}-${overrideA ?? 'def'}-${overrideB ?? 'def'}`}
                        matchId={match.id}
                        weightClass={match.weight_class ?? undefined}
                        sideA={{ name: effectiveAName, school: schoolA, logo: match.school_a_logo, school_id: match.school_a_id ? Number(match.school_a_id) : null, bg_color: colorA, logo_direction: dirA }}
                        sideB={{ name: effectiveBName, school: schoolB, logo: match.school_b_logo, school_id: match.school_b_id ? Number(match.school_b_id) : null, bg_color: colorB, logo_direction: dirB }}
                        onComplete={onComplete}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── BoutCard ─────────────────────────────────────────────────────────────────

function BoutCard({ detail, phase, meetId, onBoutPrediction }: {
  detail: MeetDetail; phase: Phase; meetId: string
  onBoutPrediction: (matchId: string, winner: 'a' | 'b' | 'even', label: string) => void
}) {
  const [scorecard, setScorecard] = useState<ScorecardEntry[]>(() =>
    detail.matches.map(m => ({ matchId: m.id, winner: null, resultType: 'DEC' }))
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  function handleBoutComplete(matchId: string, i: number, winner: 'a' | 'b', resultType: string) {
    setScorecard(sc => {
      const idx = sc.findIndex(e => e.matchId === matchId)
      if (idx === -1) return [...sc, { matchId, winner, resultType }]
      const next = [...sc]
      next[idx] = { ...next[idx], winner, resultType }
      return next
    })
    const sorted = [...detail.matches].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    const nextIdx = i + 1 < sorted.length ? i + 1 : null
    setOpenIdx(nextIdx)
  }

  let scoreA = 0, scoreB = 0
  for (const entry of scorecard) {
    if (!entry.winner || !entry.resultType) continue
    const pts = resultPoints(entry.resultType)
    if (entry.winner === 'a') scoreA += pts
    else scoreB += pts
  }

  const officialA = detail.matches.reduce((s, m) => s + (m.team1_points ?? 0), 0)
  const officialB = detail.matches.reduce((s, m) => s + (m.team2_points ?? 0), 0)

  const displayA = phase === 'final' ? officialA : scoreA
  const displayB = phase === 'final' ? officialB : scoreB

  async function handleSubmit() {
    setSaving(true)
    const bouts = scorecard
      .filter(e => e.winner)
      .map(e => {
        const pts = resultPoints(e.resultType)
        return {
          match_id: e.matchId,
          result_type: e.resultType,
          winner_side: e.winner === 'a' ? 'A' : 'B',
          pts_a: e.winner === 'a' ? pts : 0,
          pts_b: e.winner === 'b' ? pts : 0,
        }
      })
    const teamA = bouts.reduce((s, b) => s + b.pts_a, 0)
    const teamB = bouts.reduce((s, b) => s + b.pts_b, 0)
    try { localStorage.setItem(`scorecard_${detail.meet.id}`, JSON.stringify(scorecard)) } catch {}

    try {
      const res = await fetch('/api/fan-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dual_meet_id: detail.meet.id, bouts, team_a_score: teamA, team_b_score: teamB, finalize: true }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Couldn't save your scorecard (${res.status})`)
      }
      setSubmitted(true)
      setSaveError(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Couldn\'t save your scorecard')
    } finally {
      setSaving(false)
    }
  }

  const sorted = [...detail.matches].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  return (
    <div className="border border-slate-200 bg-white rounded-lg overflow-hidden">
      {/* Score bar */}
      <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50">
        <span className="text-xs font-bold text-slate-700 truncate max-w-[35%] text-center">{detail.meet.school_a}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-black tabular-nums text-slate-900">{displayA}</span>
          <span className="text-slate-400">–</span>
          <span className="text-xl font-black tabular-nums text-slate-900">{displayB}</span>
        </div>
        <span className="text-xs font-bold text-slate-700 truncate max-w-[35%] text-center">{detail.meet.school_b}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs table-fixed">
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[8%]" />
            <col className="w-[46%]" />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase">{detail.meet.school_a}</th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase">Wt</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase">{detail.meet.school_b}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((match, i) => (
              <BoutRow
                key={match.id}
                match={match}
                phase={phase}
                index={i}
                schoolA={detail.meet.school_a}
                schoolB={detail.meet.school_b}
                meetId={meetId}
                meetDate={detail.meet.meet_date}
                meetTime={detail.meet.meet_time}
                gender={detail.meet.gender}
                colorA={detail.meet.color_a}
                colorB={detail.meet.color_b}
                dirA={detail.meet.logo_dir_a}
                dirB={detail.meet.logo_dir_b}
                scorecardEntry={scorecard.find(e => e.matchId === match.id) ?? { matchId: match.id, winner: null, resultType: 'DEC' }}
                onScorecardChange={entry => setScorecard(sc => {
                  const idx = sc.findIndex(e => e.matchId === match.id)
                  if (idx === -1) return [...sc, entry]
                  const next = [...sc]; next[idx] = entry; return next
                })}
                onBoutPrediction={onBoutPrediction}
                isOpen={openIdx === i}
                onToggle={() => setOpenIdx(prev => prev === i ? null : i)}
                onComplete={(winner, resultType) => handleBoutComplete(match.id, i, winner, resultType)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mark as Final */}
      {(phase === 'scoring_soon' || phase === 'live') && (
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          {submitted ? (
            <p className="text-xs text-green-700 font-medium">✓ Saved to your profile · {detail.meet.school_a} {scoreA} – {scoreB} {detail.meet.school_b}</p>
          ) : (
            <>
              <p className={`text-xs ${saveError ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                {saveError ?? 'Score any bouts, then mark as final to save to your profile'}
              </p>
              <button
                onClick={handleSubmit}
                disabled={saving || scorecard.every(e => !e.winner)}
                style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, background: '#000', color: '#fbbf24', border: 'none', borderRadius: 4, cursor: saving ? 'default' : 'pointer', opacity: (saving || scorecard.every(e => !e.winner)) ? 0.5 : 1 }}
              >
                {saving ? 'Saving…' : 'Mark as Final'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TestControls ─────────────────────────────────────────────────────────────

function TestControls({ meets, meetId, onMeetChange, phase, onPhaseChange, isPremier, onPremierChange, premierLabel, onPremierLabelChange, homeColor, onHomeColorChange, mobileView, onMobileViewChange }: {
  meets: RawMeet[]
  meetId: string
  onMeetChange: (id: string) => void
  phase: Phase
  onPhaseChange: (p: Phase) => void
  isPremier: boolean
  onPremierChange: (v: boolean) => void
  premierLabel: string
  onPremierLabelChange: (v: string) => void
  homeColor: string
  onHomeColorChange: (v: string) => void
  mobileView: boolean
  onMobileViewChange: (v: boolean) => void
}) {
  return (
    <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Test Controls</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Meet</label>
          <select
            value={meetId}
            onChange={e => onMeetChange(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black bg-white"
          >
            <option value="">— choose a meet —</option>
            {meets.map(m => (
              <option key={m.id} value={m.id}>
                {m.meet_date} · {m.school_a ?? '?'} vs {m.school_b ?? '?'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Phase Override</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['future', 'scoring_soon', 'live', 'final'] as Phase[]).map(p => (
              <button
                key={p}
                onClick={() => onPhaseChange(p)}
                className={`px-2 py-1.5 text-[10px] font-medium border rounded transition-colors ${
                  phase === p ? 'bg-black text-white border-black' : 'border-slate-300 text-slate-600 hover:border-slate-600'
                }`}
              >
                {p === 'future' ? 'Future' : p === 'scoring_soon' ? 'Scoring Soon' : p === 'live' ? '● Live' : 'Final'}
              </button>
            ))}
          </div>
        </div>

        {/* Home color + premier controls side by side */}
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Home Team Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={homeColor.startsWith('#') ? homeColor : '#1a3a6b'}
                onChange={e => onHomeColorChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-300 p-0.5"
              />
              <input
                type="text"
                value={homeColor}
                onChange={e => onHomeColorChange(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="#1a3a6b or hsl(...)"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="premier-toggle"
              checked={isPremier}
              onChange={e => onPremierChange(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
            <label htmlFor="premier-toggle" className="text-xs text-slate-600 cursor-pointer select-none">Premier Dual</label>
          </div>
          {isPremier && (
            <input
              type="text"
              value={premierLabel}
              onChange={e => onPremierLabelChange(e.target.value)}
              placeholder="e.g. State Dual Championship"
              className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
            />
          )}
        </div>

        <div className="pt-1 border-t border-slate-100">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Scoring Panel View</label>
          <div className="flex gap-1.5">
            {([false, true] as const).map(mobile => (
              <button
                key={String(mobile)}
                onClick={() => onMobileViewChange(mobile)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-medium border rounded transition-colors ${
                  mobileView === mobile ? 'bg-black text-white border-black' : 'border-slate-300 text-slate-600 hover:border-slate-600'
                }`}
              >
                {mobile ? '📱 Mobile (390px)' : '🖥 Desktop'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MatchCardTestClient() {
  const [meets, setMeets] = useState<RawMeet[]>([])
  const [meetId, setMeetId] = useState('')
  const [detail, setDetail] = useState<MeetDetail | null>(null)
  const [phase, setPhase] = useState<Phase>('future')
  const [isPremier, setIsPremier] = useState(false)
  const [premierLabel, setPremierLabel] = useState('')
  const [homeColor, setHomeColor] = useState('#1a3a6b')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [boutPredictions, setBoutPredictions] = useState<BoutPredMap>({})
  const [mobileView, setMobileView] = useState(false)

  function handleBoutPrediction(matchId: string, winner: 'a' | 'b' | 'even', label: string) {
    setBoutPredictions(prev => ({ ...prev, [matchId]: { winner, label } }))
  }

  // Auto-fetch H2H predictions for all bouts when a meet loads in future phase
  useEffect(() => {
    if (!detail || phase !== 'future') return
    setBoutPredictions({})
    const bouts = detail.matches.filter(m => m.wrestler_a_id && m.wrestler_b_id)
    for (const match of bouts) {
      fetch(`/api/h2h?a=${match.wrestler_a_id}&b=${match.wrestler_b_id}&gender=${detail.meet.gender === 'F' ? 'F' : 'M'}&exclude_meet=${detail.meet.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.prediction) handleBoutPrediction(match.id, d.prediction.favoredWrestler, d.prediction.outcomeLabel)
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.meet?.id, phase])

  useEffect(() => {
    fetch('/api/admin/match-card')
      .then(r => r.json())
      .then(d => setMeets(d.meets ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!meetId) { setDetail(null); return }
    setLoading(true); setErr(null); setDetail(null)
    fetch(`/api/admin/match-card?id=${meetId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setDetail(d)
        // Use real school primary_color if available, otherwise hash fallback
        if (d.meet?.color_b) setHomeColor(d.meet.color_b)
        else if (d.meet?.school_b) setHomeColor(hashColor(d.meet.school_b))
      })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [meetId])

  return (
    <div className="p-4 space-y-4">
      <TestControls
        meets={meets}
        meetId={meetId}
        onMeetChange={id => { setMeetId(id); setDetail(null); setBoutPredictions({}) }}
        phase={phase}
        onPhaseChange={setPhase}
        isPremier={isPremier}
        onPremierChange={setIsPremier}
        premierLabel={premierLabel}
        onPremierLabelChange={setPremierLabel}
        homeColor={homeColor}
        onHomeColorChange={setHomeColor}
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
      />

      {loading && <p className="text-sm text-slate-400 py-8 text-center">Loading meet…</p>}
      {err    && <p className="text-sm text-red-500 py-4">{err}</p>}
      {!meetId && !loading && (
        <div className="border border-dashed border-slate-200 rounded-lg py-12 text-center">
          <p className="text-sm text-slate-400">Select a meet above to preview the match card</p>
        </div>
      )}

      {detail && (
        <div style={mobileView ? { display: 'flex', justifyContent: 'center' } : {}}>
          <div style={mobileView ? {
            width: 390,
            flexShrink: 0,
            boxShadow: '0 0 0 10px #1c1c1e, 0 0 0 12px #3a3a3c',
            borderRadius: 6,
            overflow: 'hidden',
          } : {}}>
            <div className="space-y-4" style={mobileView ? { padding: 0 } : {}}>
              <MatchHeader meet={detail.meet} phase={phase} isPremier={isPremier} premierLabel={premierLabel} homeColor={homeColor} boutPredictions={boutPredictions} />
              <BoutCard detail={detail} phase={phase} meetId={detail.meet.id} onBoutPrediction={handleBoutPrediction} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
