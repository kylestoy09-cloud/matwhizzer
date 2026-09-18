'use client'

import { useState } from 'react'

type School = { id: number; display_name: string; logo_url: string | null; primary_color: string | null }
type SeedEntry = { seed: number; school: School | null; wins: number; losses: number; pp: number }
type GroupData = {
  section: string
  classification: string
  label: string
  key: string
  seeds: SeedEntry[]
  confirmed: boolean
  isNPA: boolean
  isNPB: boolean
}

const QF_PAIRS: [number, number][] = [[1,8],[4,5],[3,6],[2,7]]

function seedColor(seed: number) {
  if (seed === 1) return 'bg-yellow-50 border-yellow-400'
  if (seed <= 3) return 'bg-blue-50 border-blue-300'
  if (seed <= 5) return 'bg-slate-50 border-slate-300'
  return 'bg-slate-50 border-slate-200'
}

function SchoolPill({ entry }: { entry: SeedEntry | null }) {
  if (!entry?.school) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-slate-300 text-slate-400 text-xs w-full">
        <span className="text-slate-300 font-bold w-4 text-center">—</span>
        <span>No team</span>
      </div>
    )
  }
  const { seed, school, pp } = entry
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded border text-left w-full ${seedColor(seed)}`}>
      <span className="text-xs font-bold text-slate-500 w-4 text-center shrink-0">{seed}</span>
      {school.logo_url && <img src={school.logo_url} alt="" className="w-5 h-5 object-contain shrink-0" />}
      <span className="font-medium text-slate-800 text-xs truncate flex-1">{school.display_name}</span>
      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{pp.toFixed(2)}</span>
    </div>
  )
}

function MatchupBlock({ seedA, seedB, label }: { seedA: SeedEntry | null; seedB: SeedEntry | null; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
      <SchoolPill entry={seedA} />
      <div className="border-t border-slate-200 mx-2" />
      <SchoolPill entry={seedB} />
    </div>
  )
}

function SFSlot({ label }: { label: string }) {
  return (
    <div className="px-2 py-1.5 rounded border border-dashed border-slate-200 text-[10px] text-slate-400 text-center">
      {label}
    </div>
  )
}

// NP-A: 13 teams, seeds 1-3 bye
// First round: 4v13, 5v12, 6v11, 7v10, 8v9
const NPA_R1_PAIRS: [number, number][] = [[4,13],[5,12],[6,11],[7,10],[8,9]]
const NPA_BYES = [1, 2, 3]

function NPABracketVisual({ byNum }: { byNum: Map<number, SeedEntry> }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 items-start min-w-[640px]">
        {/* First round */}
        <div className="flex flex-col gap-3 min-w-[200px] w-[200px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">First Round</div>
          {NPA_R1_PAIRS.map(([a, b]) => (
            <MatchupBlock key={a} seedA={byNum.get(a) ?? null} seedB={byNum.get(b) ?? null} label={`${a} vs ${b}`} />
          ))}
        </div>

        <div className="flex flex-col w-5 shrink-0 mt-7 self-stretch">
          {NPA_R1_PAIRS.map((_, i) => (
            <div key={i} className="flex-1 flex flex-col">
              <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
              <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
            </div>
          ))}
        </div>

        {/* Byes + QF placeholders */}
        <div className="flex flex-col gap-3 min-w-[190px] w-[190px] mt-7">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Quarterfinals</div>
          {/* QF top: winner of 4/13 vs winner of 5/12 */}
          <SFSlot label="W(4/13) vs W(5/12)" />
          {/* seed 1 bye */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${seedColor(1)}`}>
            <span className="text-xs font-bold text-slate-500 w-4 text-center shrink-0">1</span>
            {byNum.get(1)?.school?.logo_url && <img src={byNum.get(1)!.school!.logo_url!} alt="" className="w-5 h-5 object-contain shrink-0" />}
            <span className="font-medium text-slate-800 text-xs truncate flex-1">{byNum.get(1)?.school?.display_name ?? '—'}</span>
            <span className="text-[10px] text-slate-400 shrink-0">BYE</span>
          </div>
          {/* seed 2 bye */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${seedColor(2)}`}>
            <span className="text-xs font-bold text-slate-500 w-4 text-center shrink-0">2</span>
            {byNum.get(2)?.school?.logo_url && <img src={byNum.get(2)!.school!.logo_url!} alt="" className="w-5 h-5 object-contain shrink-0" />}
            <span className="font-medium text-slate-800 text-xs truncate flex-1">{byNum.get(2)?.school?.display_name ?? '—'}</span>
            <span className="text-[10px] text-slate-400 shrink-0">BYE</span>
          </div>
          {/* seed 3 bye */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${seedColor(3)}`}>
            <span className="text-xs font-bold text-slate-500 w-4 text-center shrink-0">3</span>
            {byNum.get(3)?.school?.logo_url && <img src={byNum.get(3)!.school!.logo_url!} alt="" className="w-5 h-5 object-contain shrink-0" />}
            <span className="font-medium text-slate-800 text-xs truncate flex-1">{byNum.get(3)?.school?.display_name ?? '—'}</span>
            <span className="text-[10px] text-slate-400 shrink-0">BYE</span>
          </div>
          <SFSlot label="W(6/11) vs W(7/10)" />
          <SFSlot label="W(8/9)" />
        </div>

        <div className="flex flex-col w-5 shrink-0 mt-7 self-stretch">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
            <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
            <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
          </div>
        </div>

        {/* Semifinals */}
        <div className="flex flex-col gap-3 min-w-[160px] w-[160px] mt-7 justify-around">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Semifinals</div>
          <SFSlot label="SF 1" />
          <SFSlot label="SF 2" />
        </div>

        <div className="flex flex-col w-5 shrink-0 mt-7 self-stretch">
          <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
          <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
        </div>

        {/* Final */}
        <div className="flex flex-col min-w-[120px] w-[120px] justify-center mt-7">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 mb-4">Final</div>
          <div className="px-3 py-2 rounded border-2 border-dashed border-yellow-300 text-[10px] text-yellow-600 font-bold text-center bg-yellow-50">Champion</div>
        </div>
      </div>
    </div>
  )
}

// NP-B: 9 teams, seed 1 bye
// Prelim: 8 vs 9 → QF: 1 vs W(8/9), 4 vs 5, 3 vs 6, 2 vs 7
function NPBBracketVisual({ byNum }: { byNum: Map<number, SeedEntry> }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 items-start min-w-[600px]">
        {/* Prelim */}
        <div className="flex flex-col gap-3 min-w-[180px] w-[180px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Prelim</div>
          <MatchupBlock seedA={byNum.get(8) ?? null} seedB={byNum.get(9) ?? null} label="8 vs 9" />
          {/* Seed 1 bye */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${seedColor(1)}`}>
            <span className="text-xs font-bold text-slate-500 w-4 text-center shrink-0">1</span>
            {byNum.get(1)?.school?.logo_url && <img src={byNum.get(1)!.school!.logo_url!} alt="" className="w-5 h-5 object-contain shrink-0" />}
            <span className="font-medium text-slate-800 text-xs truncate flex-1">{byNum.get(1)?.school?.display_name ?? '—'}</span>
            <span className="text-[10px] text-slate-400 shrink-0">BYE</span>
          </div>
        </div>

        <div className="flex flex-col w-5 shrink-0 mt-7">
          <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
          <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
        </div>

        {/* QF */}
        <div className="flex flex-col gap-3 min-w-[200px] w-[200px] mt-7">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Quarterfinals</div>
          <MatchupBlock seedA={byNum.get(1) ?? null} seedB={null} label="1 vs W(8/9)" />
          <MatchupBlock seedA={byNum.get(4) ?? null} seedB={byNum.get(5) ?? null} label="4 vs 5" />
          <MatchupBlock seedA={byNum.get(3) ?? null} seedB={byNum.get(6) ?? null} label="3 vs 6" />
          <MatchupBlock seedA={byNum.get(2) ?? null} seedB={byNum.get(7) ?? null} label="2 vs 7" />
        </div>

        <div className="flex flex-col w-5 shrink-0 mt-7">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
            <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
          </div>
          <div className="h-3" />
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
            <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
          </div>
        </div>

        {/* SF */}
        <div className="flex flex-col gap-3 min-w-[160px] w-[160px] mt-7 justify-around">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Semifinals</div>
          <SFSlot label="SF 1" />
          <SFSlot label="SF 2" />
        </div>

        <div className="flex flex-col w-5 shrink-0 mt-7">
          <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
          <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
        </div>

        {/* Final */}
        <div className="flex flex-col min-w-[120px] w-[120px] justify-center mt-7">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 mb-4">Final</div>
          <div className="px-3 py-2 rounded border-2 border-dashed border-yellow-300 text-[10px] text-yellow-600 font-bold text-center bg-yellow-50">Champion</div>
        </div>
      </div>
    </div>
  )
}

function BracketPanel({ group, seasonId, gender, onConfirm, onUnconfirm }: {
  group: GroupData; seasonId: number; gender: string
  onConfirm: () => void; onUnconfirm: () => void
}) {
  const [seeds, setSeeds] = useState<SeedEntry[]>(group.seeds)
  const [confirmed, setConfirmed] = useState(group.confirmed)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const byNum = new Map(seeds.map(s => [s.seed, s]))
  const sortedSeeds = [...seeds].sort((a, b) => a.seed - b.seed)

  function swapSeeds(seedA: number, seedB: number) {
    const entryA = byNum.get(seedA)
    const entryB = byNum.get(seedB)
    if (!entryA || !entryB) return
    setSeeds(prev => prev.map(s => {
      if (s.seed === seedA) return { seed: seedA, school: entryB.school, wins: entryB.wins, losses: entryB.losses, pp: entryB.pp }
      if (s.seed === seedB) return { seed: seedB, school: entryA.school, wins: entryA.wins, losses: entryA.losses, pp: entryA.pp }
      return s
    }))
    setConfirmed(false)
    setSaveMsg(null)
  }

  function handleDragStart(seedNum: number) {
    setDragFrom(seedNum)
  }

  function handleDragOver(e: React.DragEvent, seedNum: number) {
    e.preventDefault()
    setDragOver(seedNum)
  }

  function handleDrop(toSeed: number) {
    if (dragFrom === null || dragFrom === toSeed) {
      setDragFrom(null)
      setDragOver(null)
      return
    }
    swapSeeds(dragFrom, toSeed)
    setDragFrom(null)
    setDragOver(null)
  }

  function handleDragEnd() {
    setDragFrom(null)
    setDragOver(null)
  }

  async function save(confirm: boolean) {
    setSaving(true)
    setSaveMsg(null)
    const bracketSize = group.isNPA ? 13 : group.isNPB ? 9 : 8
    const bracketSeeds = seeds.filter(s => s.seed <= bracketSize)
    const res = await fetch('/api/admin/playoff-seeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        season_id: seasonId,
        gender,
        section: group.section,
        classification: group.classification,
        confirmed: confirm,
        seeds: bracketSeeds.map(s => ({ seed: s.seed, school_id: s.school?.id ?? null })),
      }),
    })
    setSaving(false)
    if (res.ok) {
      if (confirm) { setConfirmed(true); onConfirm() }
      setSaveMsg(confirm ? 'Confirmed!' : 'Saved')
      setTimeout(() => setSaveMsg(null), 3000)
    } else {
      const errData = await res.json().catch(() => ({}))
      setSaveMsg(`Error: ${errData.error ?? res.status}`)
    }
  }

  const bracketSize = group.isNPA ? 13 : group.isNPB ? 9 : 8
  const pairs = QF_PAIRS.map(([a, b]) => ({ a: byNum.get(a) ?? null, b: byNum.get(b) ?? null }))
  const bracketSeeds = seeds.filter(s => s.seed <= bracketSize)
  const altSeeds = seeds.filter(s => s.seed > bracketSize)

  return (
    <div>
      {/* Bracket visual */}
      {group.isNPA ? (
        <NPABracketVisual byNum={byNum} />
      ) : group.isNPB ? (
        <NPBBracketVisual byNum={byNum} />
      ) : (
      <div className="flex gap-0 items-stretch overflow-x-auto">
        <div className="flex flex-col gap-4 min-w-[220px] w-[220px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Quarterfinals</div>
          {pairs.map((pair, i) => (
            <MatchupBlock key={i} seedA={pair.a} seedB={pair.b} label={`${QF_PAIRS[i][0]} vs ${QF_PAIRS[i][1]}`} />
          ))}
        </div>

        <div className="flex flex-col w-6 shrink-0 mt-7">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
            <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
          </div>
          <div className="h-4" />
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
            <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-[200px] w-[200px] justify-around mt-7">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">Semifinals</div>
          <SFSlot label="Winner 1/8 vs Winner 4/5" />
          <div className="h-4" />
          <SFSlot label="Winner 3/6 vs Winner 2/7" />
        </div>

        <div className="flex flex-col w-6 shrink-0 mt-7">
          <div className="flex-1 border-r-2 border-b-2 border-slate-300 rounded-br-sm" />
          <div className="flex-1 border-r-2 border-t-2 border-slate-300 rounded-tr-sm" />
        </div>

        <div className="flex flex-col min-w-[140px] w-[140px] justify-center mt-7">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 mb-4">Final</div>
          <div className="px-3 py-2 rounded border-2 border-dashed border-yellow-300 text-[10px] text-yellow-600 font-bold text-center bg-yellow-50">Champion</div>
        </div>
      </div>
      )}

      {/* Drag-and-drop seed table */}
      <div className="mt-6">
        <p className="text-xs text-slate-400 mb-2">
          {group.isNPA
            ? 'Drag rows to reorder. Seeds 1–3 have first-round byes; seeds 4–13 play in round 1.'
            : group.isNPB
            ? 'Drag rows to reorder. Seed 1 has a bye; seeds 8 & 9 play a prelim; seeds 2–7 enter in QF.'
            : 'Drag rows to reorder. Seeds 1–8 are in the bracket; 9–12 are alternates.'}
        </p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-6 px-2 py-1.5" />
              {!confirmed && <th className="w-12 px-1 py-1.5" />}
              <th className="text-left px-3 py-1.5 text-slate-500 font-medium w-10">#</th>
              <th className="text-left px-3 py-1.5 text-slate-500 font-medium">School</th>
              <th className="text-right px-3 py-1.5 text-slate-500 font-medium w-16">W-L</th>
              <th className="text-right px-3 py-1.5 text-slate-500 font-medium w-16">PP</th>
            </tr>
          </thead>
          <tbody>
            {/* Bracket seeds */}
            {bracketSeeds.map((s, idx) => {
              const prevSeed = sortedSeeds[sortedSeeds.findIndex(x => x.seed === s.seed) - 1]?.seed
              const nextSeed = sortedSeeds[sortedSeeds.findIndex(x => x.seed === s.seed) + 1]?.seed
              return (
                <tr
                  key={s.seed}
                  draggable={!confirmed}
                  onDragStart={() => handleDragStart(s.seed)}
                  onDragOver={e => handleDragOver(e, s.seed)}
                  onDrop={() => handleDrop(s.seed)}
                  onDragEnd={handleDragEnd}
                  className={`border-b border-slate-100 transition-colors ${
                    dragOver === s.seed ? 'bg-blue-50' : dragFrom === s.seed ? 'opacity-40' : 'hover:bg-slate-50'
                  } ${!confirmed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <td className="px-2 py-1.5 text-slate-300 select-none">⠿</td>
                  {!confirmed && (
                    <td className="px-1 py-1.5">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={prevSeed === undefined}
                          onClick={() => swapSeeds(s.seed, prevSeed!)}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none px-1"
                          title="Move up"
                        >▲</button>
                        <button
                          type="button"
                          disabled={nextSeed === undefined}
                          onClick={() => swapSeeds(s.seed, nextSeed!)}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none px-1"
                          title="Move down"
                        >▼</button>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-1.5 font-bold text-slate-700">{s.seed}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{s.school?.display_name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{s.school ? `${s.wins}-${s.losses}` : '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{s.school ? s.pp.toFixed(2) : '—'}</td>
                </tr>
              )
            })}

            {/* Divider + remaining rows */}
            {altSeeds.length > 0 && <>
            <tr>
              <td colSpan={confirmed ? 5 : 6} className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.isNPA ? 'All NP-A Schools — use arrows or drag to replace a seed' : group.isNPB ? 'All NP-B Schools — use arrows or drag to replace a seed' : 'Alternates'}
              </td>
            </tr>
            {altSeeds.map(s => {
              const prevSeed = sortedSeeds[sortedSeeds.findIndex(x => x.seed === s.seed) - 1]?.seed
              const nextSeed = sortedSeeds[sortedSeeds.findIndex(x => x.seed === s.seed) + 1]?.seed
              return (
                <tr
                  key={s.seed}
                  draggable={!confirmed}
                  onDragStart={() => handleDragStart(s.seed)}
                  onDragOver={e => handleDragOver(e, s.seed)}
                  onDrop={() => handleDrop(s.seed)}
                  onDragEnd={handleDragEnd}
                  className={`border-b border-slate-100 transition-colors ${
                    dragOver === s.seed ? 'bg-blue-50' : dragFrom === s.seed ? 'opacity-40' : 'hover:bg-slate-50'
                  } ${!confirmed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <td className="px-2 py-1.5 text-slate-300 select-none">⠿</td>
                  {!confirmed && (
                    <td className="px-1 py-1.5">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={prevSeed === undefined}
                          onClick={() => swapSeeds(s.seed, prevSeed!)}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none px-1"
                          title="Move up"
                        >▲</button>
                        <button
                          type="button"
                          disabled={nextSeed === undefined}
                          onClick={() => swapSeeds(s.seed, nextSeed!)}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none px-1"
                          title="Move down"
                        >▼</button>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-1.5 font-bold text-slate-400">{s.seed}</td>
                  <td className="px-3 py-1.5 text-slate-500">{s.school?.display_name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{s.school ? `${s.wins}-${s.losses}` : '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{s.school ? s.pp.toFixed(2) : '—'}</td>
                </tr>
              )
            })}
            </>}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        {confirmed ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-100 text-green-800 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Confirmed
            </span>
            <button onClick={() => { setConfirmed(false); setSaveMsg(null); onUnconfirm() }} className="text-xs text-slate-400 hover:text-slate-700 underline">
              Edit
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => save(false)} disabled={saving} className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50">
              Save Draft
            </button>
            <button onClick={() => save(true)} disabled={saving} className="px-4 py-1.5 text-sm bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50 font-medium">
              Confirm Bracket
            </button>
          </>
        )}
        {saveMsg && (
          <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>
        )}
      </div>
    </div>
  )
}

export function PlayoffSeedsClient({ groups, seasonId, gender }: { groups: GroupData[]; seasonId: number; gender: string }) {
  const [activeTab, setActiveTab] = useState(0)
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(
    () => new Set(groups.filter(g => g.confirmed).map(g => g.key))
  )

  function handleConfirm(key: string) {
    setConfirmedKeys(prev => new Set([...prev, key]))
  }
  function handleUnconfirm(key: string) {
    setConfirmedKeys(prev => { const s = new Set(prev); s.delete(key); return s })
  }

  const confirmedCount = confirmedKeys.size

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{confirmedCount}</span> / {groups.length} confirmed
        </div>
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(confirmedCount / groups.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200 pb-2">
        {groups.map((g, i) => (
          <button
            key={g.key}
            onClick={() => setActiveTab(i)}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors relative ${activeTab === i ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {g.label}
            {confirmedKeys.has(g.key) && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
          </button>
        ))}
      </div>

      {groups.map((g, i) => (
        <div key={g.key} style={{ display: i === activeTab ? 'block' : 'none' }} className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {g.section === 'Non-Public'
                ? `Non-Public Group ${g.classification}`
                : `${g.section} Group ${g.classification}`}
            </h2>
            {confirmedKeys.has(g.key) && (
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">Confirmed</span>
            )}
          </div>
          <BracketPanel
            group={g}
            seasonId={seasonId}
            gender={gender}
            onConfirm={() => handleConfirm(g.key)}
            onUnconfirm={() => handleUnconfirm(g.key)}
          />
        </div>
      ))}
    </div>
  )
}
