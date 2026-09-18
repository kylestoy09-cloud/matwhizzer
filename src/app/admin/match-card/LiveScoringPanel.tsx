'use client'

import { useState, useEffect, useRef } from 'react'
import { logoFlipStyle } from '@/lib/logo-direction'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Period = 1 | 2 | 3 | 'OT' | 'TB1' | 'TB2' | 'UTB'
type Position = 'neutral' | 'a_top' | 'b_top'

type ScoringAction = {
  id: string
  period: Period
  timeSnap: number
  wrestler: 'a' | 'b'
  points: number
  label: string
}

type FlipFlow =
  | { stage: 'who_won' }
  | { stage: 'p2_choose'; chooser: 'a' | 'b'; canDefer: boolean; flipWinner: 'a' | 'b' }
  | { stage: 'p3_choose'; chooser: 'a' | 'b' }
  | { stage: 'ot_flip' }
  | { stage: 'tb1_choose'; chooser: 'a' | 'b'; tb2chooser: 'a' | 'b'; canDefer: boolean }
  | { stage: 'tb2_choose'; chooser: 'a' | 'b' }
  | { stage: 'utb_flip' }
  | { stage: 'utb_choose'; chooser: 'a' | 'b' }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function periodLabel(p: Period): string {
  if (p === 'OT')  return 'S.V.'
  if (p === 'TB1') return 'TB1'
  if (p === 'TB2') return 'TB2'
  if (p === 'UTB') return 'UTB'
  return `Period ${p}`
}

function choiceToPos(chooser: 'a' | 'b', choice: string): Position {
  if (choice === 'top')    return chooser === 'a' ? 'a_top' : 'b_top'
  if (choice === 'bottom') return chooser === 'a' ? 'b_top' : 'a_top'
  return 'neutral'
}

function periodDuration(p: Period): number {
  if (p === 'OT') return 60
  if (p === 'TB1' || p === 'TB2' || p === 'UTB') return 30
  return 120
}

function fmtTime(secs: number): string {
  const s = Math.max(0, secs)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function isOnTop(wrestler: 'a' | 'b', pos: Position): boolean {
  return (wrestler === 'a' && pos === 'a_top') || (wrestler === 'b' && pos === 'b_top')
}

function isOnBottom(wrestler: 'a' | 'b', pos: Position): boolean {
  return (wrestler === 'a' && pos === 'b_top') || (wrestler === 'b' && pos === 'a_top')
}

function availablePoints(wrestler: 'a' | 'b', pos: Position): Set<number> {
  if (pos === 'neutral') return new Set([1, 3])
  if (isOnTop(wrestler, pos)) return new Set([1, 2, 3, 4])
  return new Set([1, 2])
}

type ConfirmOpt = { label: string; action: string }

function getConfirmOpts(pts: number, wrestler: 'a' | 'b', pos: Position): ConfirmOpt[] {
  const bottom = isOnBottom(wrestler, pos)
  const top = isOnTop(wrestler, pos)
  const neutral = pos === 'neutral'

  if (pts === 1) {
    const opts: ConfirmOpt[] = []
    if (bottom) opts.push({ label: 'Escape', action: 'Escape' })
    opts.push({ label: 'Stalling', action: 'Stalling' })
    opts.push({ label: 'Penalty', action: 'Penalty' })
    return opts
  }
  if (pts === 2) {
    if (bottom) return [{ label: 'Reversal', action: 'Reversal' }]
    if (top) return [{ label: 'Back Pts', action: 'Back Points (2)' }]
    return []
  }
  if (pts === 3) {
    if (neutral) return [{ label: 'Takedown', action: 'Takedown' }]
    if (top) return [{ label: 'Back Pts', action: 'Back Points (3)' }]
    return []
  }
  return []
}

// ─── DigitalDisplay ────────────────────────────────────────────────────────────

function DigitalDisplay({
  value,
  fontSize,
  color = '#fbbf24',
  glow = true,
}: {
  value: string | number
  fontSize: string
  color?: string
  glow?: boolean
}) {
  return (
    <span
      style={{
        fontFamily: "'DSEG7 Classic', monospace",
        fontSize,
        lineHeight: 1,
        color,
        textShadow: glow
          ? `0 0 8px ${color}88, 0 0 20px ${color}44`
          : 'none',
        letterSpacing: '0.05em',
      }}>
      {String(value)}
    </span>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

type Side = { name: string | null; school: string; logo: string | null; school_id?: number | null; bg_color?: string | null; logo_direction?: string | null }

// ─── Numpad ─────────────────────────────────────────────────────────────────────

function Numpad({ onDigit, onBack, onConfirm }: {
  onDigit: (d: string) => void
  onBack: () => void
  onConfirm: () => void
}) {
  const cellCls = 'bg-zinc-700 text-zinc-100 font-bold text-xl rounded p-3 hover:bg-zinc-600 active:bg-zinc-500 transition-colors'
  return (
    <div className="grid grid-cols-3 gap-2">
      {['7','8','9','4','5','6','1','2','3'].map(d => (
        <button key={d} onClick={() => onDigit(d)} className={cellCls}>{d}</button>
      ))}
      <button onClick={onBack} className={cellCls + ' text-base'}>⌫</button>
      <button onClick={() => onDigit('0')} className={cellCls}>0</button>
      <button onClick={onConfirm} className="bg-emerald-700 text-emerald-200 font-bold text-xl rounded p-3 hover:bg-emerald-600 active:bg-emerald-500 transition-colors">✓</button>
    </div>
  )
}

// ─── QuickEntry ──────────────────────────────────────────────────────────────────

function QuickEntry({ sideA, sideB, onComplete, onBack }: {
  sideA?: Side
  sideB?: Side
  onComplete: (winner: 'a' | 'b', resultType: string) => void
  onBack: () => void
}) {
  type QStep = 'pick' | 'away_score' | 'home_score' | 'confirm_score' | 'pick_winner' | 'time' | 'tf_score'
  const [step, setStep] = useState<QStep>('pick')
  const [rt, setRt] = useState<'DEC' | 'MD' | 'TF' | 'FALL' | null>(null)
  const [awayScore, setAwayScore] = useState<number | null>(null)
  const [homeScore, setHomeScore] = useState<number | null>(null)
  const [winner, setWinner] = useState<'a' | 'b' | null>(null)
  const [timeMin, setTimeMin] = useState(0)
  const [timeSec, setTimeSec] = useState(0)
  const [timeStep, setTimeStep] = useState<1 | 10>(1)
  const [num, setNum] = useState('')

  const awayName = (sideA?.name ?? sideA?.school ?? 'Away').split(/\s+/).pop() ?? 'Away'
  const homeName = (sideB?.name ?? sideB?.school ?? 'Home').split(/\s+/).pop() ?? 'Home'

  function pickResult(r: 'DEC' | 'MD' | 'TF' | 'FALL') {
    setRt(r); setNum(''); setAwayScore(null); setHomeScore(null); setWinner(null)
    setStep(r === 'DEC' || r === 'MD' ? 'away_score' : 'pick_winner')
  }

  function confirmNum() {
    const n = parseInt(num) || 0
    if (step === 'away_score') {
      setAwayScore(n); setNum(''); setStep('home_score')
    } else if (step === 'home_score') {
      setHomeScore(n); setNum(''); setStep('confirm_score')
    } else if (step === 'tf_score') {
      onComplete(winner!, 'TF')
    }
  }

  function confirmTime() {
    if (rt === 'FALL') {
      onComplete(winner!, 'FALL')
    } else {
      setNum(''); setStep('tf_score')
    }
  }

  function adjustTime(delta: number) {
    const total = timeMin * 60 + timeSec
    const next = Math.max(0, Math.min(599, total + delta))
    setTimeMin(Math.floor(next / 60))
    setTimeSec(next % 60)
  }

  function goBack() {
    if (step === 'pick')           { onBack() }
    else if (step === 'away_score')     { setNum(''); setStep('pick') }
    else if (step === 'home_score')     { setNum(''); setStep('away_score') }
    else if (step === 'confirm_score')  { setNum(''); setStep('home_score') }
    else if (step === 'pick_winner')    { setStep('pick') }
    else if (step === 'time')           { setStep('pick_winner') }
    else if (step === 'tf_score')       { setNum(''); setStep('time') }
  }

  const scoreWinner: 'a' | 'b' = (awayScore ?? 0) >= (homeScore ?? 0) ? 'a' : 'b'
  const numDisp = (num || '0').padStart(2, ' ')

  const backLabel = step === 'pick' ? '← Detailed Scoring' : '← Back'

  return (
    <div className="space-y-3">
      <button onClick={goBack}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
        {backLabel}
      </button>

      {step === 'pick' && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Result Type</p>
          <div className="grid grid-cols-2 gap-2">
            {(['DEC', 'MD', 'TF', 'FALL'] as const).map(r => (
              <button key={r} onClick={() => pickResult(r)}
                className="py-5 text-sm font-bold bg-zinc-700 text-zinc-100 rounded border-2 border-zinc-600 hover:border-amber-400 hover:text-amber-400 transition-colors">
                {r === 'DEC' ? 'Decision' : r === 'MD' ? 'Major Dec' : r === 'TF' ? 'Tech Fall' : 'Fall'}
              </button>
            ))}
          </div>
        </div>
      )}

      {(step === 'away_score' || step === 'home_score') && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">
            {step === 'away_score' ? awayName : homeName} Score
          </p>
          {step === 'home_score' && (
            <p className="text-[9px] text-zinc-500 text-center">{awayName}: {awayScore ?? 0}</p>
          )}
          <div className="bg-black px-4 py-3 text-center">
            <DigitalDisplay value={numDisp} fontSize="2.4rem" color="#fbbf24" />
          </div>
          <Numpad
            onDigit={d => setNum(p => p.length >= 2 ? p : p + d)}
            onBack={() => setNum(p => p.slice(0, -1))}
            onConfirm={confirmNum}
          />
        </div>
      )}

      {step === 'confirm_score' && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Confirm Result</p>
          <div className="bg-black px-4 py-5">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <DigitalDisplay
                  value={String(awayScore ?? 0).padStart(2, ' ')}
                  fontSize="2.2rem"
                  color={scoreWinner === 'a' ? '#fbbf24' : '#52525b'}
                  glow={scoreWinner === 'a'}
                />
                <p className="text-[9px] text-zinc-400 mt-1">{awayName}</p>
              </div>
              <span className="text-zinc-600 font-bold text-lg">–</span>
              <div className="text-center">
                <DigitalDisplay
                  value={String(homeScore ?? 0).padStart(2, ' ')}
                  fontSize="2.2rem"
                  color={scoreWinner === 'b' ? '#fbbf24' : '#52525b'}
                  glow={scoreWinner === 'b'}
                />
                <p className="text-[9px] text-zinc-400 mt-1">{homeName}</p>
              </div>
            </div>
            <p className="text-[9px] text-center text-zinc-500 mt-3">
              {scoreWinner === 'a' ? awayName : homeName} wins by {rt}
            </p>
          </div>
          <button onClick={() => onComplete(scoreWinner, rt!)}
            className="w-full py-3 text-sm font-bold bg-emerald-800 text-emerald-200 rounded hover:bg-emerald-700 transition-colors">
            Confirm →
          </button>
        </div>
      )}

      {step === 'pick_winner' && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Who Won?</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setWinner('a'); setStep('time') }}
              className="py-5 text-sm font-black bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
              {awayName}
            </button>
            <button onClick={() => { setWinner('b'); setStep('time') }}
              className="py-5 text-sm font-black bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
              {homeName}
            </button>
          </div>
        </div>
      )}

      {step === 'time' && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">
            {rt === 'FALL' ? 'Fall Time' : 'Tech Fall Time'}
          </p>
          {/* Time display — min always ±1, sec controlled by toggle */}
          <div className="flex items-center justify-center gap-4 bg-black py-3">
            {/* Minutes — always ±1 */}
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => setTimeMin(m => Math.min(m + 1, 9))}
                className="text-zinc-400 hover:text-amber-400 text-base px-2 py-1">▲</button>
              <span className="text-3xl font-black tabular-nums text-zinc-100 w-10 text-center">{timeMin}</span>
              <button onClick={() => setTimeMin(m => Math.max(m - 1, 0))}
                className="text-zinc-400 hover:text-amber-400 text-base px-2 py-1">▼</button>
            </div>
            <span className="text-2xl font-bold text-zinc-500 self-center">:</span>
            {/* Seconds — step controlled by toggle */}
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => adjustTime(timeStep)}
                className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors px-2 py-1">
                <span className="text-base">▲</span>
                {timeStep === 10 && <span className="text-[9px] font-bold text-zinc-500">+10</span>}
              </button>
              <span className="text-3xl font-black tabular-nums text-zinc-100 w-14 text-center">{String(timeSec).padStart(2, '0')}</span>
              <button onClick={() => adjustTime(-timeStep)}
                className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors px-2 py-1">
                {timeStep === 10 && <span className="text-[9px] font-bold text-zinc-500">-10</span>}
                <span className="text-base">▼</span>
              </button>
            </div>
          </div>
          {/* Seconds step-size toggle */}
          <div className="flex gap-2">
            <button onClick={() => setTimeStep(1)}
              className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${timeStep === 1 ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
              ±1s
            </button>
            <button onClick={() => setTimeStep(10)}
              className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${timeStep === 10 ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
              ±10s
            </button>
          </div>
          <p className="text-[9px] text-zinc-500 text-center">{winner === 'a' ? awayName : homeName} wins</p>
          <button onClick={confirmTime}
            className="w-full py-2.5 text-sm font-bold bg-emerald-800 text-emerald-200 rounded hover:bg-emerald-700 transition-colors">
            Confirm {rt === 'FALL' ? 'Fall' : 'Time'} →
          </button>
        </div>
      )}

      {step === 'tf_score' && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">
            {winner === 'a' ? awayName : homeName} Score
          </p>
          <div className="bg-black px-4 py-3 text-center">
            <DigitalDisplay value={numDisp} fontSize="2.4rem" color="#fbbf24" />
          </div>
          <Numpad
            onDigit={d => setNum(p => p.length >= 2 ? p : p + d)}
            onBack={() => setNum(p => p.slice(0, -1))}
            onConfirm={confirmNum}
          />
        </div>
      )}
    </div>
  )
}

export function LiveScoringPanel({
  matchId,
  weightClass,
  sideA,
  sideB,
  onComplete,
}: {
  matchId: string
  weightClass?: string
  sideA?: Side
  sideB?: Side
  onComplete?: (winner: 'a' | 'b', resultType: string) => void
}) {
  const [quickMode, setQuickMode] = useState(false)
  const [period, setPeriod]     = useState<Period>(1)
  const [timeLeft, setTimeLeft] = useState(120)
  const [running, setRunning]   = useState(false)
  const [position, setPosition] = useState<Position>('neutral')
  const [p3Chooser, setP3Chooser] = useState<'a' | 'b'>('b')
  const [tb2Chooser, setTb2Chooser] = useState<'a' | 'b'>('b')
  const [flipFlow, setFlipFlow] = useState<FlipFlow | null>(null)
  const [pendingA, setPendingA] = useState<number | null>(null)
  const [pendingB, setPendingB] = useState<number | null>(null)
  const [pinState, setPinState] = useState<{ wrestler: 'a' | 'b'; min: number; sec: number } | null>(null)
  const [actions, setActions]   = useState<ScoringAction[]>([])
  const [boutOver, setBoutOver] = useState(false)
  const [techFall, setTechFall] = useState(false)
  const [rideOutWinner, setRideOutWinner] = useState<'a' | 'b' | null>(null)
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [pendingActionA, setPendingActionA] = useState<{pts: number; label: string} | null>(null)
  const [pendingActionB, setPendingActionB] = useState<{pts: number; label: string} | null>(null)

  const periodRef    = useRef(period)
  const timeRef      = useRef(timeLeft)
  const posRef       = useRef(position)
  const scoreARef    = useRef(0)
  const scoreBRef    = useRef(0)
  const tb2ChooserRef = useRef(tb2Chooser)
  periodRef.current    = period
  timeRef.current      = timeLeft
  posRef.current       = position
  tb2ChooserRef.current = tb2Chooser

  const scoreA = actions.filter(a => a.wrestler === 'a').reduce((s, a) => s + a.points, 0)
  const scoreB = actions.filter(a => a.wrestler === 'b').reduce((s, a) => s + a.points, 0)
  scoreARef.current = scoreA
  scoreBRef.current = scoreB
  const lead = Math.abs(scoreA - scoreB)

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [running])

  // Auto-stop timer when it hits 0
  useEffect(() => {
    if (timeLeft === 0 && running) setRunning(false)
  }, [timeLeft, running])

  useEffect(() => {
    if (timeLeft > 0 || running || boutOver || flipFlow) return
    if (period === 1) {
      setFlipFlow({ stage: 'who_won' })
    } else if (period === 2) {
      setFlipFlow({ stage: 'p3_choose', chooser: p3Chooser })
    } else if (period === 3) {
      if (scoreA !== scoreB) setBoutOver(true)
      // tied: showEnterOT button handles it
    } else if (period === 'OT') {
      setFlipFlow({ stage: 'ot_flip' })
    } else if (period === 'TB1') {
      setFlipFlow({ stage: 'tb2_choose', chooser: tb2ChooserRef.current })
    } else if (period === 'TB2') {
      if (scoreA !== scoreB) setBoutOver(true)
      // tied: ride-out button handles it
    }
  }, [timeLeft, running, boutOver, period, flipFlow, p3Chooser, scoreA, scoreB])

  function handleFinalize() {
    if (!onComplete) return
    if (rideOutWinner) { onComplete(rideOutWinner, 'DEC'); return }
    if (scoreA === scoreB) return
    const isFall = actions.some(a => a.label.startsWith('Fall'))
    const resultType = isFall ? 'FALL' : techFall ? 'TF' : lead >= 8 ? 'MD' : 'DEC'
    const winner: 'a' | 'b' = scoreA > scoreB ? 'a' : 'b'
    onComplete(winner, resultType)
  }

  // ── Controls ───────────────────────────────────────────────────────────────

  function startTimer() { if (!running && !boutOver && !pinState && !flipFlow) setRunning(true) }
  function stopTimer()  { setRunning(false) }
  function adjustTime(delta: number) {
    if (running) return
    setTimeLeft(t => Math.max(0, Math.min(t + delta, periodDuration(period))))
  }
  function jumpToPeriod(p: Period) {
    setRunning(false)
    setPendingA(null); setPendingB(null); setPendingActionA(null); setPendingActionB(null)
    if (p === 2) {
      setPeriod(2); setTimeLeft(120)
      setFlipFlow({ stage: 'who_won' })
      return
    }
    if (p === 3) {
      setPeriod(3); setTimeLeft(120)
      setFlipFlow({ stage: 'p3_choose', chooser: p3Chooser })
      return
    }
    if (p === 'TB1') {
      setPeriod('TB1'); setTimeLeft(30)
      setFlipFlow({ stage: 'ot_flip' })
      return
    }
    if (p === 'TB2') {
      setPeriod('TB2'); setTimeLeft(30)
      setFlipFlow({ stage: 'tb2_choose', chooser: tb2Chooser })
      return
    }
    if (p === 'UTB') {
      setPeriod('UTB'); setTimeLeft(30)
      setFlipFlow({ stage: 'utb_flip' })
      return
    }
    setPeriod(p); setTimeLeft(periodDuration(p))
    setPosition('neutral'); setFlipFlow(null)
  }

  // ── Coin flip ──────────────────────────────────────────────────────────────

  function handleFlipWinner(winner: 'a' | 'b') {
    setFlipFlow({ stage: 'p2_choose', chooser: winner, canDefer: true, flipWinner: winner })
  }

  function applyP2Choice(flow: { chooser: 'a' | 'b'; canDefer: boolean; flipWinner: 'a' | 'b' }, choice: string) {
    const other: 'a' | 'b' = flow.chooser === 'a' ? 'b' : 'a'
    if (choice === 'defer') {
      setP3Chooser(flow.flipWinner)
      setFlipFlow({ stage: 'p2_choose', chooser: other, canDefer: false, flipWinner: flow.flipWinner })
      return
    }
    const newPos: Position =
      choice === 'top'    ? (flow.chooser === 'a' ? 'a_top' : 'b_top') :
      choice === 'bottom' ? (flow.chooser === 'a' ? 'b_top' : 'a_top') : 'neutral'
    setPosition(newPos)
    if (flow.canDefer) setP3Chooser(other)
    setPeriod(2); setTimeLeft(120); setFlipFlow(null)
  }

  function applyP3Choice(chooser: 'a' | 'b', choice: string) {
    const newPos: Position =
      choice === 'top'    ? (chooser === 'a' ? 'a_top' : 'b_top') :
      choice === 'bottom' ? (chooser === 'a' ? 'b_top' : 'a_top') : 'neutral'
    setPosition(newPos); setPeriod(3); setTimeLeft(120); setFlipFlow(null)
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  function handleScore(wrestler: 'a' | 'b', pts: number) {
    if (boutOver || flipFlow) return
    if (pts === -1) {
      if (!isOnTop(wrestler, posRef.current)) return
      setRunning(false)
      const elapsed = periodDuration(periodRef.current) - timeRef.current
      setPinState({ wrestler, min: Math.floor(elapsed / 60), sec: elapsed % 60 })
      return
    }
    if (!availablePoints(wrestler, posRef.current).has(pts)) return
    if (pts === 4) {
      if (wrestler === 'a') { setPendingActionA({ pts: 4, label: 'Back Points (4)' }); setPendingB(null) }
      else                   { setPendingActionB({ pts: 4, label: 'Back Points (4)' }); setPendingA(null) }
    } else {
      const opts = getConfirmOpts(pts, wrestler, posRef.current)
      if (opts.length === 1) {
        if (wrestler === 'a') { setPendingActionA({ pts, label: opts[0].action }); setPendingB(null) }
        else                   { setPendingActionB({ pts, label: opts[0].action }); setPendingA(null) }
      } else {
        if (wrestler === 'a') { setPendingA(pts); setPendingB(null) }
        else                   { setPendingB(pts); setPendingA(null) }
      }
    }
  }

  function confirmAction(wrestler: 'a' | 'b', pts: number, action: string) {
    if (wrestler === 'a') { setPendingActionA({ pts, label: action }); setPendingA(null) }
    else { setPendingActionB({ pts, label: action }); setPendingB(null) }
  }

  function confirmTimeBlock(wrestler: 'a' | 'b', elapsed: number) {
    const pa = wrestler === 'a' ? pendingActionA : pendingActionB
    if (!pa) return
    finishAction(wrestler, pa.pts, pa.label, elapsed)
    if (wrestler === 'a') setPendingActionA(null); else setPendingActionB(null)
  }

  function cancelPending(wrestler: 'a' | 'b') {
    if (wrestler === 'a') { setPendingA(null); setPendingActionA(null) }
    else { setPendingB(null); setPendingActionB(null) }
  }

  function confirmPin() {
    if (!pinState) return
    const { wrestler, min, sec } = pinState
    finishAction(wrestler, 6, `Fall @ ${min}:${String(sec).padStart(2, '0')}`)
    setPinState(null)
  }

  function finishAction(wrestler: 'a' | 'b', points: number, action: string, timeSnap = 0) {
    const newA = scoreARef.current + (wrestler === 'a' ? points : 0)
    const newB = scoreBRef.current + (wrestler === 'b' ? points : 0)
    commit(wrestler, points, action, timeSnap)
    if (action === 'Takedown')  setPosition(wrestler === 'a' ? 'a_top' : 'b_top')
    else if (action === 'Escape')   setPosition('neutral')
    else if (action === 'Reversal') setPosition(wrestler === 'a' ? 'a_top' : 'b_top')
    const isFall = action.startsWith('Fall')
    if (isFall || Math.abs(newA - newB) >= 15) {
      setRunning(false); setBoutOver(true)
      if (!isFall) setTechFall(true)
    } else if (periodRef.current === 'OT' || periodRef.current === 'TB1' || periodRef.current === 'TB2' || periodRef.current === 'UTB') {
      // Sudden victory / tiebreaker: first score ends the bout
      setRunning(false); setBoutOver(true)
    }
  }

  function commit(wrestler: 'a' | 'b', points: number, label: string, timeSnap = 0) {
    setActions(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      period: periodRef.current, timeSnap,
      wrestler, points, label,
    }])
  }

  function deleteAction(id: string) { setActions(prev => prev.filter(a => a.id !== id)) }

  function undoLastAction() {
    const next = actions.slice(0, -1)
    // Recompute position from remaining actions
    let pos: Position = 'neutral'
    for (const a of next) {
      if (a.label === 'Takedown') pos = a.wrestler === 'a' ? 'a_top' : 'b_top'
      else if (a.label === 'Escape') pos = 'neutral'
      else if (a.label === 'Reversal') pos = a.wrestler === 'a' ? 'a_top' : 'b_top'
    }
    const newA = next.filter(x => x.wrestler === 'a').reduce((s, x) => s + x.points, 0)
    const newB = next.filter(x => x.wrestler === 'b').reduce((s, x) => s + x.points, 0)
    const hasFall = next.some(a => a.label.startsWith('Fall'))
    setActions(next)
    setPosition(pos)
    setPendingA(null)
    setPendingB(null)
    if (boutOver && !hasFall && Math.abs(newA - newB) < 15) {
      setBoutOver(false)
      setTechFall(false)
    }
  }

  // ── OT transitions ────────────────────────────────────────────────────────

  function handleOTFlipWinner(winner: 'a' | 'b') {
    const other: 'a' | 'b' = winner === 'a' ? 'b' : 'a'
    setFlipFlow({ stage: 'tb1_choose', chooser: winner, tb2chooser: other, canDefer: true })
  }

  function applyTB1Choice(flow: { chooser: 'a' | 'b'; tb2chooser: 'a' | 'b'; canDefer: boolean }, choice: string) {
    if (choice === 'defer') {
      const other: 'a' | 'b' = flow.chooser === 'a' ? 'b' : 'a'
      setFlipFlow({ stage: 'tb1_choose', chooser: other, tb2chooser: flow.chooser, canDefer: false })
      return
    }
    setTb2Chooser(flow.tb2chooser)
    setPosition(choiceToPos(flow.chooser, choice))
    setFlipFlow(null)
  }

  function applyTB2Choice(chooser: 'a' | 'b', choice: string) {
    setPosition(choiceToPos(chooser, choice))
    setFlipFlow(null)
  }

  function handleUTBFlipWinner(winner: 'a' | 'b') {
    setFlipFlow({ stage: 'utb_choose', chooser: winner })
  }

  function applyUTBChoice(chooser: 'a' | 'b', choice: string) {
    setPosition(choiceToPos(chooser, choice))
    setFlipFlow(null)
  }

  function awardRideOut() {
    const topWrestler: 'a' | 'b' = position === 'a_top' ? 'a' : 'b'
    setRideOutWinner(topWrestler)
    setRunning(false)
    setBoutOver(true)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const runningScores = actions.map((_, i) => ({
    a: actions.slice(0, i + 1).filter(x => x.wrestler === 'a').reduce((s, x) => s + x.points, 0),
    b: actions.slice(0, i + 1).filter(x => x.wrestler === 'b').reduce((s, x) => s + x.points, 0),
  }))
  const recordRows = actions.map((action, i) => ({ action, score: runningScores[i] })).reverse()

  const boutResultLabel = boutOver
    ? rideOutWinner
      ? `${rideOutWinner === 'a' ? 'A' : 'B'} wins by Ride-Out`
      : techFall
      ? `Tech Fall · ${scoreA > scoreB ? 'A' : 'B'} wins ${Math.max(scoreA, scoreB)}–${Math.min(scoreA, scoreB)}`
      : scoreA > scoreB ? `A wins ${scoreA}–${scoreB}` : scoreB > scoreA ? `B wins ${scoreB}–${scoreA}` : `Tied ${scoreA}–${scoreB}`
    : null

  // ── Time blocks ────────────────────────────────────────────────────────────

  function getTimeBlocks(p: Period): { label: string; elapsed: number }[] {
    if (p === 'OT') return [
      { label: '0:00–0:30', elapsed: 15 },
      { label: '0:30–1:00', elapsed: 45 },
    ]
    if (p === 'TB1' || p === 'TB2' || p === 'UTB') return [
      { label: '0:00–0:15', elapsed: 8 },
      { label: '0:15–0:30', elapsed: 22 },
    ]
    return [
      { label: '0:00–0:30', elapsed: 15 },
      { label: '0:30–1:00', elapsed: 45 },
      { label: '1:01–1:30', elapsed: 75 },
      { label: '1:31–2:00', elapsed: 105 },
    ]
  }

  // ── ScorerCard ─────────────────────────────────────────────────────────────

  function ScorerCard({ wrestler }: { wrestler: 'a' | 'b' }) {
    const pending       = wrestler === 'a' ? pendingA : pendingB
    const pendingAction = wrestler === 'a' ? pendingActionA : pendingActionB
    const isPinning     = pinState?.wrestler === wrestler
    const avail         = availablePoints(wrestler, position)
    const canPin        = isOnTop(wrestler, position) && !boutOver

    if (isPinning && pinState) {
      return (
        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-center text-amber-400">Pin Time</p>
          <div className="flex items-center justify-center gap-2">
            {(['min', 'sec'] as const).map((field, fi) => (
              <div key={field} className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => setPinState(s => s && { ...s, [field]: Math.min(s[field] + 1, field === 'min' ? 9 : 59) })}
                  className="text-zinc-400 hover:text-amber-400 text-sm px-1">▲</button>
                <span className="text-2xl font-black tabular-nums text-zinc-100 w-8 text-center">
                  {field === 'sec' ? String(pinState.sec).padStart(2, '0') : pinState.min}
                </span>
                <button
                  onClick={() => setPinState(s => s && { ...s, [field]: Math.max(s[field] - 1, 0) })}
                  className="text-zinc-400 hover:text-amber-400 text-sm px-1">▼</button>
                {fi === 0 && <span className="text-xl font-bold text-zinc-500 absolute" style={{ marginLeft: '2.5rem' }}>:</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setPinState(null)}
              className="flex-1 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
            <button onClick={confirmPin}
              className="flex-1 py-1.5 text-[10px] font-bold bg-amber-400 text-black rounded hover:bg-amber-300 transition-colors">
              Confirm Pin
            </button>
          </div>
        </div>
      )
    }

    if (pendingAction !== null) {
      const blocks = getTimeBlocks(period)
      const cols = blocks.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
      return (
        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-center text-amber-400">
            {pendingAction.label} · When?
          </p>
          <div className={`grid ${cols} gap-1.5`}>
            {blocks.map(b => (
              <button key={b.label} onClick={() => confirmTimeBlock(wrestler, b.elapsed)}
                className="py-2.5 text-[11px] font-semibold bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
                {b.label}
              </button>
            ))}
          </div>
          <button onClick={() => cancelPending(wrestler)}
            className="w-full py-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
        </div>
      )
    }

    if (pending !== null) {
      const opts      = getConfirmOpts(pending, wrestler, position)
      const gridItems = opts.length % 2 === 1 ? [...opts, null] : opts
      return (
        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-center text-amber-400">
            +{pending} · Confirm
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {gridItems.map((opt, i) =>
              opt ? (
                <button key={opt.action} onClick={() => confirmAction(wrestler, pending, opt.action)}
                  className="py-2.5 text-[11px] font-semibold bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
                  {opt.label}
                </button>
              ) : (
                <div key={i} className="py-2.5 rounded bg-zinc-700/40" />
              )
            )}
          </div>
          <button onClick={() => cancelPending(wrestler)}
            className="w-full py-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
        </div>
      )
    }

    if (boutOver) {
      return (
        <div className="bg-zinc-800 rounded-lg flex items-center justify-center min-h-[110px]">
          <p className="text-sm text-zinc-500">—</p>
        </div>
      )
    }

    return (
      <div className="bg-zinc-800 rounded-lg p-3 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map(pts => {
            const disabled = !avail.has(pts)
            return (
              <button key={pts} onClick={() => handleScore(wrestler, pts)} disabled={disabled}
                className={`py-3 text-sm font-black rounded transition-colors ${
                  disabled
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-400 text-black hover:bg-amber-300'
                }`}>
                +{pts}
              </button>
            )
          })}
        </div>
        <div className="flex gap-1.5">
          {(period === 'TB2' || period === 'UTB') && isOnTop(wrestler, position) && (
            <button onClick={awardRideOut}
              className="flex-1 py-2.5 text-sm font-black rounded tracking-wider bg-zinc-600 text-zinc-100 hover:bg-zinc-500 transition-colors">
              Ride-Out
            </button>
          )}
          <button onClick={() => handleScore(wrestler, -1)} disabled={!canPin}
            className={`${(period === 'TB2' || period === 'UTB') && isOnTop(wrestler, position) ? 'flex-1' : 'w-full'} py-2.5 text-sm font-black rounded transition-colors tracking-wider ${
              canPin
                ? 'bg-amber-400 text-red-900 hover:bg-red-900 hover:text-red-300'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}>
            PIN
          </button>
        </div>
      </div>
    )
  }

  // ── Choice Modal ───────────────────────────────────────────────────────────

  function ChoiceModal() {
    if (!flipFlow) return null

    const btnCls = 'py-3 text-sm font-bold bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors'
    const lastName = (w: 'a' | 'b') => {
      const name = (w === 'a' ? sideA : sideB)?.name
      if (!name) return w.toUpperCase()
      return name.trim().split(/\s+/).pop() ?? w.toUpperCase()
    }

    if (flipFlow.stage === 'who_won') return (
      <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className="text-xs font-bold text-zinc-200">Period 2 · Coin Flip</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Who won the flip?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as const).map(w => (
            <button key={w} onClick={() => handleFlipWinner(w)}
              className="py-5 text-base font-black bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
              {lastName(w)}
            </button>
          ))}
        </div>
      </div>
    )

    if (flipFlow.stage === 'p2_choose') {
      const { chooser, canDefer } = flipFlow
      const choices = [
        { label: 'Top',    value: 'top' },
        { label: 'Bottom', value: 'bottom' },
        { label: 'Neutral',value: 'neutral' },
        ...(canDefer ? [{ label: 'Defer to P3', value: 'defer' }] : []),
      ]
      return (
        <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-200">Period 2 Choice</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              <span className="font-bold text-amber-400">{lastName(chooser)}</span> chooses for Period 2
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {choices.map(c => (
              <button key={c.value} onClick={() => applyP2Choice(flipFlow, c.value)} className={btnCls}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (flipFlow.stage === 'p3_choose') {
      const { chooser } = flipFlow
      return (
        <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-200">Period 3 Choice</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              <span className="font-bold text-amber-400">{lastName(chooser)}</span> chooses for Period 3
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['top', 'bottom', 'neutral'] as const).map(c => (
              <button key={c} onClick={() => applyP3Choice(chooser, c)} className={btnCls + ' capitalize'}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (flipFlow.stage === 'ot_flip') return (
      <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className="text-xs font-bold text-zinc-200">Tiebreaker · Coin Flip</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Who won the flip?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as const).map(w => (
            <button key={w} onClick={() => handleOTFlipWinner(w)}
              className="py-5 text-base font-black bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
              {lastName(w)}
            </button>
          ))}
        </div>
      </div>
    )

    if (flipFlow.stage === 'tb1_choose') {
      const { chooser, canDefer } = flipFlow
      const choices = [
        { label: 'Top',    value: 'top' },
        { label: 'Bottom', value: 'bottom' },
        ...(canDefer ? [{ label: 'Defer', value: 'defer' }] : []),
      ]
      return (
        <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-200">TB1 · Position Choice</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              <span className="font-bold text-amber-400">{lastName(chooser)}</span> chooses starting position
            </p>
          </div>
          <div className={`grid gap-2 ${choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {choices.map(c => (
              <button key={c.value} onClick={() => applyTB1Choice(flipFlow, c.value)} className={btnCls}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (flipFlow.stage === 'tb2_choose') {
      const { chooser } = flipFlow
      return (
        <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-200">TB2 · Position Choice</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              <span className="font-bold text-amber-400">{lastName(chooser)}</span> chooses starting position
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">Top holds = win · Escape = win</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'bottom'] as const).map(c => (
              <button key={c} onClick={() => applyTB2Choice(chooser, c)} className={btnCls + ' capitalize'}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (flipFlow.stage === 'utb_flip') return (
      <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className="text-xs font-bold text-zinc-200">Ultimate TB · Coin Flip</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Who won the flip?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as const).map(w => (
            <button key={w} onClick={() => handleUTBFlipWinner(w)}
              className="py-5 text-base font-black bg-zinc-700 text-zinc-100 rounded hover:bg-amber-400 hover:text-black transition-colors">
              {lastName(w)}
            </button>
          ))}
        </div>
      </div>
    )

    if (flipFlow.stage === 'utb_choose') {
      const { chooser } = flipFlow
      return (
        <div className="col-span-2 bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-200">Ultimate TB · Position</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              <span className="font-bold text-amber-400">{lastName(chooser)}</span> chooses
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">Top holds 30s = win · Bottom escapes = win</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'bottom'] as const).map(c => (
              <button key={c} onClick={() => applyUTBChoice(chooser, c)} className={btnCls + ' capitalize'}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )
    }

    return null
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  function SidePanel({ side, position }: { side?: Side; position: 'away' | 'home' }) {
    if (!side) return null
    const abbr = side.school.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
    const flipStyle = logoFlipStyle(side.logo_direction as 'left' | 'right' | null ?? null, position)
    const bg = side.bg_color ?? '#1e293b'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {side.logo ? (
            <img src={side.logo} alt={side.school} style={{ width: 40, height: 40, objectFit: 'contain', ...flipStyle }} />
          ) : (
            <span className="text-xs font-black text-white">{abbr}</span>
          )}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5', textAlign: 'center', lineHeight: 1.3 }}>
          {side.name ?? side.school}
        </p>
      </div>
    )
  }

  return (
    <div className="relative bg-zinc-800 border-2 border-zinc-600 overflow-hidden">

      {/* ── Bout result overlay ── */}
      {boutOver && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 50, gap: 18, padding: '24px 20px',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: '#71717a', textTransform: 'uppercase' }}>
            Bout Over
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {(['a', 'b'] as const).map(w => {
              const score  = w === 'a' ? scoreA : scoreB
              const oScore = w === 'a' ? scoreB : scoreA
              const side   = w === 'a' ? sideA   : sideB
              const isWinner = rideOutWinner ? rideOutWinner === w : score > oScore
              return (
                <div key={w} style={{ textAlign: 'center' }}>
                  <DigitalDisplay
                    value={String(score).padStart(2, ' ')}
                    fontSize="3.5rem"
                    color={isWinner ? '#fbbf24' : '#3f3f46'}
                    glow={isWinner}
                  />
                  <p style={{ fontSize: 10, color: '#a1a1aa', marginTop: 6, fontWeight: 600 }}>
                    {side?.school ?? w.toUpperCase()}
                  </p>
                </div>
              )
            })}
          </div>

          {boutResultLabel && (
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center' }}>
              {boutResultLabel}
            </p>
          )}

          {onComplete && (
            <button
              onClick={handleFinalize}
              style={{
                background: '#000', color: '#fbbf24',
                border: '2px solid #fbbf24',
                fontWeight: 700, fontSize: 13,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '10px 36px', borderRadius: 4, cursor: 'pointer',
              }}>
              Mark as Final
            </button>
          )}
        </div>
      )}

      {/* ── Fan Scoring banner ── */}
      <div style={{
        background: '#1c1c1e',
        padding: '6px 12px',
        textAlign: 'center',
        borderBottom: '1px solid #3f3f46',
      }}>
        <span style={{
          fontFamily: "'Stardos Stencil', sans-serif",
          fontSize: 13,
          letterSpacing: '0.3em',
          color: '#fbbf24',
          textTransform: 'uppercase',
        }}>
          Fan Scoring
        </span>
      </div>

      {/* ── Scoreboard header ── */}
      <div className="px-3 pt-3 pb-3">

        {/* Logo + Score + Logo row — grid so side cols share equal space */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

          <div className="flex justify-center">
            <SidePanel side={sideA} position="away" />
          </div>

          {/* Score cards + period */}
          <div className="flex items-center gap-2">
            <div className="bg-black px-3 py-2 text-center">
              <DigitalDisplay value={String(scoreA).padStart(2, ' ')} fontSize="2.4rem" color="#fbbf24" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              {(() => {
                const label = periodLabel(period)
                const match = label.match(/^(Period|TB)\s*(\d+)$/)
                if (match) return (
                  <>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-300 leading-none">{match[1]}</span>
                    <span className="text-[15px] font-black text-zinc-200 leading-none">{match[2]}</span>
                  </>
                )
                return <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">{label}</span>
              })()}
              {running && (
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider animate-pulse mt-0.5">● Live</span>
              )}
              {boutOver && (
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Final</span>
              )}
            </div>
            <div className="bg-black px-3 py-2 text-center">
              <DigitalDisplay value={String(scoreB).padStart(2, ' ')} fontSize="2.4rem" color="#fbbf24" />
            </div>
          </div>

          <div className="flex justify-center">
            <SidePanel side={sideB} position="home" />
          </div>

        </div>

        {!boutOver && lead >= 12 && lead < 15 && (
          <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest text-center mt-2">
            {15 - lead} pt{15 - lead !== 1 ? 's' : ''} to Tech Fall
          </p>
        )}
        {boutOver && boutResultLabel && (
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider text-center mt-2">
            {boutResultLabel}
          </p>
        )}
      </div>

      {/* ── Weight class banner ── */}
      {weightClass && (
        <div className="px-4 py-2">
          <div style={{
            background: '#a1a1aa',
            clipPath: 'polygon(0% 0%, 100% 0%, calc(100% - 16px) 50%, 100% 100%, 0% 100%, 16px 50%)',
            padding: '9px 28px',
            textAlign: 'center',
          }}>
            <span style={{
              fontFamily: "'Stardos Stencil', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: '#18181b',
              lineHeight: 1,
            }}>
              {weightClass} lbs
            </span>
          </div>
        </div>
      )}

      {/* ── Quick Score Entry toggle ── */}
      <div style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 8, textAlign: 'center' }}>
        <button
          onClick={() => setQuickMode(q => !q)}
          style={{
            width: '100%',
            padding: '6px 0',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            border: '1px solid #52525b',
            borderRadius: 4,
            background: quickMode ? '#3f3f46' : '#fbbf24',
            color: quickMode ? '#d4d4d8' : '#18181b',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {quickMode ? '← Full Scoring' : 'Enter Score'}
        </button>
      </div>

      <div className="p-3 space-y-3">
        {quickMode ? (
          <QuickEntry sideA={sideA} sideB={sideB} onComplete={onComplete ?? (() => {})} onBack={() => setQuickMode(false)} />
        ) : (<>

        {/* ── Period selection ── */}
        <div className="bg-zinc-900 p-3 space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {([1, 2, 3] as const).map(p => (
              <button key={p} onClick={() => jumpToPeriod(p)}
                className={`py-2 text-[11px] font-bold rounded transition-colors ${
                  period === p
                    ? 'bg-amber-400 text-black'
                    : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500 hover:text-white'
                }`}>
                Period {p}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => jumpToPeriod('OT')}
              className={`py-2 text-[11px] font-bold rounded transition-colors ${
                period === 'OT' ? 'bg-amber-400 text-black' : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500 hover:text-white'
              }`}>
              OT-SV
            </button>
            <div className="flex flex-col gap-1">
              {(['TB1', 'TB2'] as const).map(p => (
                <button key={p} onClick={() => jumpToPeriod(p)}
                  className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${
                    period === p ? 'bg-amber-400 text-black' : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500 hover:text-white'
                  }`}>
                  OT-{p}
                </button>
              ))}
            </div>
            <button onClick={() => jumpToPeriod('UTB')}
              className={`py-2 text-[11px] font-bold rounded transition-colors ${
                period === 'UTB' ? 'bg-amber-400 text-black' : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500 hover:text-white'
              }`}>
              OT-UTB
            </button>
          </div>
        </div>

        {/* ── Scorer cards ── */}
        <div className="grid grid-cols-2 gap-2">
          {flipFlow ? <ChoiceModal /> : (
            <>
              <ScorerCard wrestler="a" />
              <ScorerCard wrestler="b" />
            </>
          )}
        </div>

        {/* ── Finalize Match ── */}
        {!boutOver && !quickMode && (
          showFinalizeConfirm ? (
            <div className="bg-zinc-800 rounded-lg p-3 space-y-3 border border-zinc-600">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Confirm Final Score</p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-zinc-100">{scoreA}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{sideA?.school ?? 'Away'}</p>
                </div>
                <span className="text-zinc-500 font-bold text-lg">–</span>
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-zinc-100">{scoreB}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{sideB?.school ?? 'Home'}</p>
                </div>
              </div>
              {scoreA === scoreB ? (
                <p className="text-[10px] text-amber-400 text-center">Score is tied — cannot finalize</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="py-2 text-xs font-bold bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => { setShowFinalizeConfirm(false); handleFinalize() }}
                  disabled={scoreA === scoreB}
                  className="py-2 text-xs font-bold bg-emerald-700 text-emerald-100 rounded hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              className="w-full py-2.5 text-xs font-bold bg-amber-400 text-zinc-900 rounded hover:bg-amber-300 transition-colors">
              Finalize Match
            </button>
          )
        )}


        {/* ── Score record ── */}
        <div className="bg-zinc-900 rounded-lg overflow-hidden">
          <div className="relative flex items-center px-3 py-2 bg-zinc-700">
            <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-zinc-200 text-center">
              Score Record
            </span>
            {actions.length > 0 && (
              <button onClick={undoLastAction}
                className="absolute right-3 text-[10px] text-zinc-300 hover:text-red-300 font-medium transition-colors">
                ← Undo
              </button>
            )}
          </div>

          {actions.length === 0 ? (
            <p className="text-[11px] text-zinc-500 py-4 text-center">No scoring recorded</p>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {recordRows.map(({ action, score }, idx) => {
                const prevPeriod = recordRows[idx - 1]?.action.period
                const showPeriodBar = idx === 0 || prevPeriod !== action.period
                return (
                  <div key={action.id}>
                    {showPeriodBar && (
                      <div className="w-full px-3 py-1.5 bg-zinc-500">
                        <span className="block text-center text-[10px] font-bold uppercase tracking-widest text-zinc-100">
                          {periodLabel(action.period)}
                        </span>
                      </div>
                    )}
                    <div
                      className="group grid grid-cols-[1fr_44px_1fr] divide-x divide-zinc-600 border-b border-zinc-600 last:border-0 hover:bg-red-900/20 cursor-pointer transition-colors"
                      onClick={() => deleteAction(action.id)} title="Click to delete">

                      <div className={`px-2 py-1.5 text-right ${action.wrestler !== 'a' ? 'opacity-0' : ''}`}>
                        <p className="text-[9px] text-zinc-400 tabular-nums">{fmtTime(action.timeSnap)}</p>
                        <p className="text-xs font-semibold text-zinc-100">{action.label}</p>
                        <p className="text-[10px] font-bold text-amber-400">+{action.points}</p>
                      </div>

                      <div className="flex flex-col items-center justify-center py-1.5 gap-0.5">
                        <span className="text-xs font-black tabular-nums text-zinc-100">
                          {score.a}–{score.b}
                        </span>
                        <span className="text-[9px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
                      </div>

                      <div className={`px-2 py-1.5 ${action.wrestler !== 'b' ? 'opacity-0' : ''}`}>
                        <p className="text-[9px] text-zinc-400 tabular-nums">{fmtTime(action.timeSnap)}</p>
                        <p className="text-xs font-semibold text-zinc-100">{action.label}</p>
                        <p className="text-[10px] font-bold text-amber-400">+{action.points}</p>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        </>)}
      </div>
    </div>
  )
}
