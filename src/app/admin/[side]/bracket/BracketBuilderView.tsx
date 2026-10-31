'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type BracketSlot = {
  id: number
  in_season_tournament_id: string
  weight_class: number
  round_name: string
  slot_number: number
  bracket_size: number
  top_wrestler_id: string | null
  top_name_raw: string | null
  top_school_id: number | null
  top_seed: number | null
  bottom_wrestler_id: string | null
  bottom_name_raw: string | null
  bottom_school_id: number | null
  bottom_seed: number | null
  winner_position: 'top' | 'bottom' | null
  winner_wrestler_id: string | null
  result_type: string | null
  result_detail: string | null
  advances_winner_to_slot: number | null
  advances_loser_to_slot: number | null
  winner_is_top_in_next: boolean | null
  loser_is_top_in_next: boolean | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NJ_WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

const RESULT_TYPES = ['fall', 'decision', 'major', 'tech', 'forfeit', 'bye', 'disqualification']

const ROUND_LABELS: Record<string, string> = {
  QF: 'Quarterfinals', SF: 'Semifinals', CSF: 'Cons. Semis',
  F: 'Finals', '3rd': '3rd Place', '5th': '5th Place', '7th': '7th Place',
}

// ── Slot Card ─────────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  isSelected,
  onClick,
}: {
  slot: BracketSlot
  isSelected: boolean
  onClick: () => void
}) {
  const hasResult   = !!slot.winner_position
  const hasAny      = !!(slot.top_name_raw || slot.bottom_name_raw)
  const borderColor = hasResult ? 'border-l-emerald-500'
    : hasAny ? 'border-l-amber-400'
    : 'border-l-slate-200'

  function Row({ pos }: { pos: 'top' | 'bottom' }) {
    const name   = pos === 'top' ? slot.top_name_raw   : slot.bottom_name_raw
    const seed   = pos === 'top' ? slot.top_seed       : slot.bottom_seed
    const isWin  = hasResult && slot.winner_position === pos
    const isLoss = hasResult && slot.winner_position !== pos
    return (
      <div className={`flex items-center gap-1 text-[11px] leading-snug min-w-0 ${
        isWin ? 'font-semibold text-slate-900' : isLoss ? 'text-slate-400' : 'text-slate-600'
      }`}>
        {seed != null && (
          <span className="text-[9px] text-slate-400 shrink-0 tabular-nums">#{seed}</span>
        )}
        <span className="truncate">{name ?? <span className="text-slate-300">—</span>}</span>
        {isWin && <span className="text-[9px] text-emerald-600 shrink-0 ml-auto">W</span>}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border border-slate-200 border-l-4 ${borderColor} bg-white px-2 py-2 hover:bg-blue-50 transition-colors ${
        isSelected ? 'ring-1 ring-blue-400 bg-blue-50' : ''
      }`}
    >
      <Row pos="top" />
      <div className="border-t border-slate-100 my-1" />
      <Row pos="bottom" />
      {hasResult && (
        <div className="text-[9px] text-slate-400 mt-0.5 truncate">
          {slot.result_type ?? ''}{slot.result_detail ? ` · ${slot.result_detail}` : ''}
        </div>
      )}
    </button>
  )
}

// ── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({
  slot,
  onSaved,
  onCancel,
}: {
  slot: BracketSlot
  onSaved: (updated: BracketSlot, advancedTo: { winner: number | null; loser: number | null }) => void
  onCancel: () => void
}) {
  const { gender } = useAdminGender()
  const [winner,       setWinner]       = useState<'top' | 'bottom' | null>(slot.winner_position)
  const [resultType,   setResultType]   = useState(slot.result_type ?? '')
  const [resultDetail, setResultDetail] = useState(slot.result_detail ?? '')
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState<string | null>(null)

  // Reset when slot changes
  useEffect(() => {
    setWinner(slot.winner_position)
    setResultType(slot.result_type ?? '')
    setResultDetail(slot.result_detail ?? '')
    setMsg(null)
  }, [slot.id])

  async function handleSave() {
    if (!winner) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/tournament-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender,
          action:                   'update_result',
          in_season_tournament_id:  slot.in_season_tournament_id,
          weight_class:             slot.weight_class,
          slot_number:              slot.slot_number,
          winner_position:          winner,
          result_type:              resultType  || null,
          result_detail:            resultDetail || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const updated: BracketSlot = {
        ...slot,
        winner_position:   winner,
        winner_wrestler_id: winner === 'top' ? slot.top_wrestler_id : slot.bottom_wrestler_id,
        result_type:       resultType  || null,
        result_detail:     resultDetail || null,
      }
      onSaved(updated, { winner: data.advanced_winner_to, loser: data.advanced_loser_to })
      setMsg('Saved ✓')
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-800">
            {ROUND_LABELS[slot.round_name] ?? slot.round_name}
          </p>
          <p className="text-[10px] text-slate-400">{slot.weight_class} lbs · Slot {slot.slot_number}</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 text-xs px-1">✕</button>
      </div>

      {/* Winner selection */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Winner</p>
        {(['top', 'bottom'] as const).map(pos => {
          const name = pos === 'top' ? slot.top_name_raw  : slot.bottom_name_raw
          const seed = pos === 'top' ? slot.top_seed      : slot.bottom_seed
          return (
            <label
              key={pos}
              className={`flex items-center gap-2 p-2.5 border cursor-pointer transition-colors ${
                winner === pos ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name={`winner-${slot.id}`}
                checked={winner === pos}
                onChange={() => setWinner(pos)}
                className="accent-black"
              />
              <span className="text-xs text-slate-700">
                {seed != null && <span className="text-slate-400 text-[10px] mr-1">#{seed}</span>}
                {name ?? <span className="text-slate-400 italic">empty</span>}
              </span>
            </label>
          )
        })}
      </div>

      {/* Result type */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Result type</label>
        <select
          value={resultType}
          onChange={e => setResultType(e.target.value)}
          className="w-full text-xs border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-slate-500"
        >
          <option value="">—</option>
          {RESULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Result detail */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          {resultType === 'fall' ? 'Fall time (e.g. 2:34)' : 'Score / detail'}
        </label>
        <input
          type="text"
          value={resultDetail}
          onChange={e => setResultDetail(e.target.value)}
          placeholder={resultType === 'fall' ? '2:34' : '8-2'}
          className="w-full text-xs border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-slate-500"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!winner || saving}
          className="px-4 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Result'}
        </button>
        {msg && (
          <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-700'}`}>
            {msg}
          </span>
        )}
      </div>

      {(slot.advances_winner_to_slot || slot.advances_loser_to_slot) && (
        <div className="text-[10px] text-slate-400 pt-1 space-y-0.5">
          {slot.advances_winner_to_slot && <p>Winner → advances to slot {slot.advances_winner_to_slot}</p>}
          {slot.advances_loser_to_slot  && <p>Loser  → advances to slot {slot.advances_loser_to_slot}</p>}
        </div>
      )}
    </div>
  )
}

// ── Weight Bracket ────────────────────────────────────────────────────────────

function WeightBracket({
  slots,
  selectedSlot,
  onSelectSlot,
}: {
  slots: BracketSlot[]
  selectedSlot: BracketSlot | null
  onSelectSlot: (s: BracketSlot) => void
}) {
  const bySlot = new Map(slots.map(s => [s.slot_number, s]))
  const get = (n: number) => bySlot.get(n)
  const size = slots[0]?.bracket_size ?? 8

  function Card(slot: BracketSlot) {
    return (
      <SlotCard
        key={slot.slot_number}
        slot={slot}
        isSelected={selectedSlot?.slot_number === slot.slot_number && selectedSlot?.weight_class === slot.weight_class}
        onClick={() => onSelectSlot(slot)}
      />
    )
  }

  function RoundCol({ label, slotNums }: { label: string; slotNums: number[] }) {
    const colSlots = slotNums.map(n => get(n)).filter(Boolean) as BracketSlot[]
    if (!colSlots.length) return null
    return (
      <div style={{ width: 192, flexShrink: 0 }}>
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex flex-col gap-2">
          {colSlots.map(s => Card(s))}
        </div>
      </div>
    )
  }

  if (size === 32) {
    const r1Nums  = Array.from({ length: 16 }, (_, i) => i + 1)
    const r2Nums  = Array.from({ length: 8 },  (_, i) => i + 17)
    const qfNums  = [25, 26, 27, 28]
    const sfNums  = [29, 30]
    const fNum    = get(31)
    const cqfNums = [32, 33]
    const csfNums = [34, 35]
    const p3      = get(36)
    const p5      = get(37)

    return (
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Championship</p>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 items-start" style={{ minWidth: 'max-content' }}>
              <RoundCol label="Round 1" slotNums={r1Nums} />
              <RoundCol label="Round 2" slotNums={r2Nums} />
              <RoundCol label="Quarterfinals" slotNums={qfNums} />
              <RoundCol label="Semifinals" slotNums={sfNums} />
              <div style={{ width: 192, flexShrink: 0 }}>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Finals</p>
                {fNum ? Card(fNum) : <div className="text-xs text-slate-300">—</div>}
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Consolation & Places</p>
          <div className="flex gap-4 items-start flex-wrap">
            <RoundCol label="Cons. QF" slotNums={cqfNums} />
            <RoundCol label="Cons. Semis" slotNums={csfNums} />
            {p3 && <div style={{ width: 192 }}><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">3rd Place</p>{Card(p3)}</div>}
            {p5 && <div style={{ width: 192 }}><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">5th Place</p>{Card(p5)}</div>}
          </div>
        </div>
      </div>
    )
  }

  // 8-man (or 4-man) layout
  const qf  = [1, 2, 3, 4].map(n => get(n)).filter(Boolean) as BracketSlot[]
  const sf  = [5, 6].map(n => get(n)).filter(Boolean) as BracketSlot[]
  const f   = get(9)
  const csf = [7, 8].map(n => get(n)).filter(Boolean) as BracketSlot[]
  const p5  = get(11)
  const p3  = get(10)
  const p7  = get(12)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Championship</p>
        <div className="flex gap-4 items-stretch" style={{ minHeight: 320 }}>
          <div style={{ width: 192 }}>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Quarterfinals</p>
            <div className="flex flex-col h-full">
              {qf.map((s, i) => (
                <div key={s.slot_number} className={i === 2 ? 'mt-4' : i > 0 ? 'mt-2' : ''}>
                  {Card(s)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: 192 }} className="flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Semifinals</p>
            <div className="flex flex-col justify-around flex-1">
              {sf.map(s => Card(s))}
            </div>
          </div>
          <div style={{ width: 192 }} className="flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Finals</p>
            <div className="flex flex-col justify-center flex-1">
              {f ? Card(f) : <div className="text-xs text-slate-300 text-center">—</div>}
            </div>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Consolation & Places</p>
        <div className="flex gap-4 items-start flex-wrap">
          {csf.length > 0 && (
            <div style={{ width: 192 }}>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Cons. Semis</p>
              <div className="flex flex-col gap-2">{csf.map(s => Card(s))}</div>
            </div>
          )}
          {p5 && <div style={{ width: 192 }}><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">5th Place</p>{Card(p5)}</div>}
          {p3 && <div style={{ width: 192 }}><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">3rd Place</p>{Card(p3)}</div>}
          {p7 && <div style={{ width: 192 }}><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">7th Place</p>{Card(p7)}</div>}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BracketBuilderView({ tid }: { tid: string }) {
  const { gender } = useAdminGender()
  const [byWeight,      setByWeight]      = useState<Record<number, BracketSlot[]>>({})
  const [seedCounts,    setSeedCounts]    = useState<Record<number, number>>({})
  const [loading,       setLoading]       = useState(true)
  const [selectedWeight,setSelectedWeight]= useState<number>(106)
  const [selectedSlot,  setSelectedSlot]  = useState<BracketSlot | null>(null)
  const [generating,    setGenerating]    = useState<number | 'all' | null>(null)
  const [syncing,       setSyncing]       = useState(false)
  const [statusMsg,     setStatusMsg]     = useState<string | null>(null)
  const [syncDetails,   setSyncDetails]   = useState<string[] | null>(null)
  const [diagnosing,    setDiagnosing]    = useState(false)
  const [diagData,      setDiagData]      = useState<Record<string, unknown> | null>(null)

  const loadBracket = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/tournament-brackets?tid=${tid}&gender=${gender}`)
    const data = await res.json()
    const bw: Record<number, BracketSlot[]> = data.byWeight ?? {}
    setByWeight(bw)
    setSeedCounts(data.seedCounts ?? {})
    // Select first weight that has a bracket, otherwise first weight with seeds, otherwise 106
    const bracketWeights = Object.keys(bw).map(Number).sort((a, b) => a - b)
    const seedWeights    = Object.keys(data.seedCounts ?? {}).map(Number).sort((a, b) => a - b)
    setSelectedWeight(prev => {
      if (bracketWeights.includes(prev)) return prev
      return bracketWeights[0] ?? seedWeights[0] ?? 106
    })
    setLoading(false)
  }, [tid, gender])

  useEffect(() => { loadBracket() }, [loadBracket])

  async function generate(weight: number | null, size: 4 | 8 | 32 | null = null) {
    const key = weight ?? 'all'
    setGenerating(key); setStatusMsg(null)
    const body: Record<string, unknown> = {
      action: 'generate_from_seeds',
      in_season_tournament_id: tid,
    }
    if (size != null) body.bracket_size = size
    if (weight) body.weight_class = weight
    try {
      const res = await fetch('/api/admin/tournament-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, gender }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatusMsg(weight
        ? `✓ Generated ${data.slot_count} slots for ${weight} lbs`
        : `✓ Generated ${data.slot_count} slots across ${data.weights_generated?.length ?? 0} weights`)
      await loadBracket()
    } catch (e) {
      setStatusMsg(`Error: ${String(e)}`)
    } finally {
      setGenerating(null)
    }
  }

  async function generateEmpty(weight: number, size: 4 | 8 = 8) {
    setGenerating(weight); setStatusMsg(null)
    try {
      const res = await fetch('/api/admin/tournament-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender,
          action: 'generate_empty',
          in_season_tournament_id: tid,
          weight_class: weight,
          bracket_size: size,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatusMsg(`✓ Empty bracket created for ${weight} lbs`)
      await loadBracket()
    } catch (e) {
      setStatusMsg(`Error: ${String(e)}`)
    } finally {
      setGenerating(null)
    }
  }

  async function syncFromBouts() {
    setSyncing(true); setStatusMsg(null); setSyncDetails(null)
    try {
      const res = await fetch('/api/admin/tournament-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, action: 'sync_from_bouts', in_season_tournament_id: tid }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const msg = `Synced ${data.synced} · ${data.skipped} skipped · ${data.total_bouts} bouts · ${data.normalized_bouts} matched rounds`
      setStatusMsg(msg)
      if (data.synced > 0) await loadBracket()
    } catch (e) {
      setStatusMsg(`Error: ${String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  async function diagnose() {
    setDiagnosing(true); setDiagData(null); setStatusMsg(null)
    try {
      const res = await fetch('/api/admin/tournament-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, action: 'diagnose', in_season_tournament_id: tid }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDiagData(data)
    } catch (e) {
      setStatusMsg(`Diagnose error: ${String(e)}`)
    } finally {
      setDiagnosing(false)
    }
  }

  async function clearBracket(weight: number) {
    if (!confirm(`Clear bracket for ${weight} lbs? This cannot be undone.`)) return
    setStatusMsg(null)
    await fetch(`/api/admin/tournament-brackets?tid=${tid}&weight=${weight}`, { method: 'DELETE' })
    setByWeight(prev => {
      const next = { ...prev }
      delete next[weight]
      return next
    })
    setSelectedSlot(null)
    setStatusMsg(`Bracket for ${weight} lbs cleared.`)
  }

  function handleSlotSaved(updated: BracketSlot, advanced: { winner: number | null; loser: number | null }) {
    setByWeight(prev => {
      const slots = (prev[updated.weight_class] ?? []).map(s =>
        s.slot_number === updated.slot_number ? updated : s
      )
      // If winner/loser advanced to another slot, reload to get the updated data
      if (advanced.winner || advanced.loser) {
        loadBracket()
        return prev
      }
      return { ...prev, [updated.weight_class]: slots }
    })
    setSelectedSlot(updated)
  }

  const currentSlots     = byWeight[selectedWeight] ?? []
  const hasBracket       = currentSlots.length > 0
  const seedCount        = seedCounts[selectedWeight] ?? 0
  const hasSeeds         = seedCount > 0
  const totalBracketWeights = Object.keys(byWeight).length
  const totalSeedWeights    = Object.keys(seedCounts).length

  return (
    <div className="flex h-full">
      {/* ── Main area ── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Bracket Builder</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totalBracketWeights} weight{totalBracketWeights !== 1 ? 's' : ''} with brackets
              {totalSeedWeights > 0 && ` · ${totalSeedWeights} with seeds`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Generate all from seeds */}
            {totalSeedWeights > 0 && (
              <button
                onClick={() => generate(null)}
                disabled={generating === 'all' || syncing}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                {generating === 'all' ? 'Generating…' : `Generate all ${totalSeedWeights} weights from seeds`}
              </button>
            )}
            {/* Sync results from already-imported bouts */}
            {totalBracketWeights > 0 && (
              <button
                onClick={syncFromBouts}
                disabled={syncing || generating !== null}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {syncing ? 'Syncing…' : '⟳ Sync Results from Bouts'}
              </button>
            )}
            <button
              onClick={diagnose}
              disabled={diagnosing}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors text-slate-600"
            >
              {diagnosing ? 'Diagnosing…' : 'Diagnose'}
            </button>
          </div>
        </div>

        {statusMsg && (
          <p className={`text-xs ${statusMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-700'}`}>
            {statusMsg}
          </p>
        )}
        {syncDetails && syncDetails.length > 0 && (
          <details className="text-[10px] text-slate-500">
            <summary className="cursor-pointer hover:text-slate-800">
              {syncDetails.length} unmatched — click to see details
            </summary>
            <ul className="mt-1 space-y-0.5 pl-2 font-mono">
              {syncDetails.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </details>
        )}
        {diagData && (
          <details open className="text-[10px] text-slate-600 border border-slate-200 p-3 bg-slate-50">
            <summary className="cursor-pointer font-semibold text-slate-700 mb-2">
              Diagnostic — {String(diagData.total_bouts ?? 0)} bouts / {String(diagData.total_slots ?? 0)} slots
            </summary>
            <div className="mt-2 space-y-3 font-mono">
              <div>
                <p className="font-bold text-slate-500 mb-1">BOUT rounds (raw DB values):</p>
                {Object.entries(diagData.bouts_by_round as Record<string, number> ?? {}).map(([r, n]) => (
                  <div key={r}>
                    <span className="text-blue-700">{r}</span>: {n} bouts —{' '}
                    <span className="text-slate-400">{(diagData.bout_sample_names as Record<string, string>)?.[r]}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-bold text-slate-500 mb-1">SLOT rounds (bracket_slots table):</p>
                {Object.entries(diagData.slots_by_round as Record<string, {total:number;withResult:number;withTop:number;withBot:number;sample:string}> ?? {}).map(([r, s]) => (
                  <div key={r}>
                    <span className="text-emerald-700">{r}</span>: {s.total} slots, {s.withResult} with result, {s.withTop} top/{s.withBot} bot populated —{' '}
                    <span className="text-slate-400">{s.sample}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {/* Weight tabs */}
        <div className="flex flex-wrap gap-1">
          {NJ_WEIGHTS.map(w => {
            const hasBkt  = !!(byWeight[w]?.length)
            const hasSeed = !!(seedCounts[w])
            return (
              <button
                key={w}
                onClick={() => { setSelectedWeight(w); setSelectedSlot(null) }}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                  w === selectedWeight
                    ? 'bg-black text-white border-black'
                    : hasBkt
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : hasSeed
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {w}
              </button>
            )
          })}
          <span className="text-[9px] text-slate-400 self-center ml-2">
            ■ bracket exists &nbsp; □ seeds only &nbsp; · none
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-12 text-center">Loading…</p>
        ) : !hasBracket ? (
          /* ── No bracket for this weight ── */
          <div className="border border-dashed border-slate-300 py-10 px-6 text-center space-y-3">
            <p className="text-sm text-slate-500">No bracket for {selectedWeight} lbs</p>
            {hasSeeds && (
              <p className="text-xs text-slate-400">{seedCount} seeds found</p>
            )}
            <div className="flex justify-center gap-2 flex-wrap">
              {hasSeeds && (
                <button
                  onClick={() => generate(selectedWeight)}
                  disabled={generating === selectedWeight}
                  className="px-4 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  {generating === selectedWeight ? 'Generating…' : `Generate from ${seedCount} seeds`}
                </button>
              )}
              <button
                onClick={() => generateEmpty(selectedWeight)}
                disabled={generating === selectedWeight}
                className="px-4 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                {generating === selectedWeight ? 'Creating…' : 'Build empty bracket'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Bracket exists ── */
          <>
            {/* Per-weight controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">{selectedWeight} lbs</span>
              <span className="text-slate-300">·</span>
              {hasSeeds && (
                <button
                  onClick={() => generate(selectedWeight)}
                  disabled={generating === selectedWeight}
                  className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-40"
                >
                  {generating === selectedWeight ? 'Regenerating…' : '↺ Regenerate from seeds'}
                </button>
              )}
              <button
                onClick={() => clearBracket(selectedWeight)}
                className="text-xs text-red-400 hover:text-red-700 ml-auto"
              >
                Clear bracket
              </button>
            </div>

            <WeightBracket
              slots={currentSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          </>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="w-[320px] flex-shrink-0 border-l border-slate-200 bg-slate-50 overflow-auto">
        {selectedSlot ? (
          <ResultPanel
            slot={selectedSlot}
            onSaved={handleSlotSaved}
            onCancel={() => setSelectedSlot(null)}
          />
        ) : (
          <div className="p-4 text-xs text-slate-400 text-center pt-12">
            Click a match to enter results
          </div>
        )}
      </div>
    </div>
  )
}
