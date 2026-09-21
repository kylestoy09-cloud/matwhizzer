'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import type { HammerConfig } from '@/lib/hammerConfig'
import type { PreviewRow } from '@/app/api/admin/hammer-score-preview/route'


// ─── Tiny primitives ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{children}</span>
}

function NumInput({
  value, onChange, min, max, step = 1, wide = false,
}: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; wide?: boolean
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className={`border border-slate-200 px-2 py-1 text-sm text-slate-800 text-right focus:outline-none focus:border-blue-400 bg-white ${wide ? 'w-24' : 'w-20'}`}
    />
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-sm text-slate-700 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

// Collapsible section
function Section({
  title, subtitle, defaultOpen = false, children,
}: {
  title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-200 mb-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {subtitle && <span className="ml-3 text-xs text-slate-400">{subtitle}</span>}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && <div className="px-5 py-4 space-y-1">{children}</div>}
    </div>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <Label>{title}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

// ─── Place points table ───────────────────────────────────────────────────────

type PlacePoints = HammerConfig['tournaments']['place_points']
type TierKey = keyof PlacePoints
type PlaceKey = keyof PlacePoints[TierKey]

function PlacePointsTable({
  value,
  onChange,
}: {
  value: PlacePoints
  onChange: (v: PlacePoints) => void
}) {
  const tiers: TierKey[] = ['20', '15', '10', '5', '1']
  const places: PlaceKey[] = ['1', '2', '3', '4', '5', '6', '7', '8']

  function update(tier: TierKey, place: PlaceKey, v: number) {
    onChange({
      ...value,
      [tier]: { ...value[tier], [place]: v },
    })
  }

  return (
    <div className="overflow-x-auto mt-2">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-200 px-2 py-1.5 text-left text-slate-500 font-semibold w-16">Tier</th>
            {places.map(p => (
              <th key={p} className="border border-slate-200 px-2 py-1.5 text-center text-slate-500 font-semibold">{ordinal(Number(p))}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map(tier => (
            <tr key={tier}>
              <td className="border border-slate-200 px-2 py-1 text-slate-600 font-medium bg-slate-50">{tier}pt</td>
              {places.map(place => (
                <td key={place} className="border border-slate-200 p-0">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={value[tier][place]}
                    onChange={e => update(tier, place, parseInt(e.target.value) || 0)}
                    className="w-full px-1 py-1 text-center text-sm focus:outline-none focus:bg-blue-50 bg-white"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ─── Main editor ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: HammerConfig = {
  matches: {
    group_weights: { a: 8, b: 6, c: 4, d: 2 },
    fall_time_buckets_seconds: [60, 120, 180, 240, 300],
    expected_outcome_thresholds: [38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 17, 13, 9, 5],
    score_rates: {
      favored_better_per_tier: 0.25,
      favored_worse_per_tier: 4,
      favored_loss_to_ot_per_tier: 4,
      favored_loss_past_ot_per_tier: 0.5,
      underdog_better_per_tier: 4,
      underdog_upset_per_tier: 0.5,
      underdog_worse_per_tier: 0.25,
      cap_diff: 40,
    },
    weight_class_adjustment: { up_per_class: 8, down_per_class: 6 },
    oos_bands: {
      tier_20:    { lo: 50, hi: 90 },
      tier_15:    { lo: 40, hi: 75 },
      tier_other: { lo: 10, hi: 30 },
    },
    bootstrap_multiplier: 2,
    ps_elevation_threshold: 16,
  },
  tournaments: {
    place_points: {
      '20': { '1': 20, '2': 19, '3': 18, '4': 17, '5': 16, '6': 15, '7': 14, '8': 13 },
      '15': { '1': 15, '2': 14, '3': 13, '4': 12, '5': 11, '6': 10, '7':  9, '8':  8 },
      '10': { '1': 10, '2':  9, '3':  8, '4':  7, '5':  0, '6':  0, '7':  0, '8':  0 },
      '5':  { '1':  5, '2':  3, '3':  1, '4':  0, '5':  0, '6':  0, '7':  0, '8':  0 },
      '1':  { '1':  1, '2':  0, '3':  0, '4':  0, '5':  0, '6':  0, '7':  0, '8':  0 },
    },
    exclude_winner_below_avg: true,
    component_ceiling: 20,
  },
  postseason: {
    state: {
      place_1: 50, place_2: 49, place_3_4: 48,
      place_5_6: 47, place_7_8: 46,
      wins_3plus: 40, wins_2: 38, wins_1: 36, wins_0: 32,
    },
    district: { champion: 20, runner_up: 16, third: 10, entry: 4 },
    component_ceiling: 50,
  },
  component_ceilings: { postseason: 50, tournament: 20, match: 30 },
}

export function HammerConfigEditor() {
  const { gender } = useAdminGender()
  const [cfg,     setCfg]     = useState<HammerConfig>(DEFAULT_CONFIG)
  const [name,    setName]    = useState('Default')
  // Season in progress for this gender, resolved by the API
  const [season,  setSeason]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    rows: PreviewRow[]
    summary: { affected: number; avgDelta: number; maxDelta: number; total: number }
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res  = await fetch(`/api/admin/hammer-score-config?gender=${gender}`)
    const data = await res.json()
    setSeason(data.season ?? null)
    if (data.row) {
      setCfg(data.row.config as HammerConfig)
      setName(data.row.name ?? 'Default')
    } else {
      setCfg(DEFAULT_CONFIG)
      setName('Default')
    }
    setLoading(false)
  }, [gender])

  useEffect(() => { load() }, [load])

  async function runPreview() {
    setPreviewing(true)
    setPreviewError(null)
    setPreview(null)
    const res = await fetch('/api/admin/hammer-score-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, season, config: cfg }),
    })
    const data = await res.json()
    setPreviewing(false)
    if (data.error) { setPreviewError(data.error); return }
    setPreview(data)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const res = await fetch('/api/admin/hammer-score-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, season, name, config: cfg }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setError(data.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Updater helpers
  const setM  = (patch: Partial<HammerConfig['matches']>)     => setCfg(c => ({ ...c, matches:    { ...c.matches,    ...patch } }))
  const setT  = (patch: Partial<HammerConfig['tournaments']>) => setCfg(c => ({ ...c, tournaments: { ...c.tournaments, ...patch } }))
  const setPS = (patch: Partial<HammerConfig['postseason']>)  => setCfg(c => ({ ...c, postseason:  { ...c.postseason,  ...patch } }))
  const setCeil = (patch: Partial<HammerConfig['component_ceilings']>) =>
    setCfg(c => ({ ...c, component_ceilings: { ...c.component_ceilings, ...patch } }))

  if (loading) return <p className="text-sm text-slate-400 py-12 text-center">Loading config…</p>

  const m  = cfg.matches
  const t  = cfg.tournaments
  const ps = cfg.postseason
  const cc = cfg.component_ceilings

  return (
    <div>
      {/* Config name + season banner */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Config name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:border-blue-400 w-40"
          />
        </div>
        <span className="text-xs text-slate-400 border border-slate-200 px-2 py-1">{gender === 'M' ? 'Boys' : 'Girls'} · {season ?? '…'}</span>
      </div>

      {/* ── Matches ────────────────────────────────────────────────── */}
      <Section title="Matches" subtitle="Match component (0–30)" defaultOpen>

        <Subsection title="Group Weights">
          <p className="text-xs text-slate-400 mb-2">Weight applied to each group of 5 matches in the rolling 20-match window. Weighted sum ÷ (5 × total weight).</p>
          <Row label="Group A (most recent 5)">
            <NumInput value={m.group_weights.a} onChange={v => setM({ group_weights: { ...m.group_weights, a: v } })} min={0} />
          </Row>
          <Row label="Group B (matches 6–10)">
            <NumInput value={m.group_weights.b} onChange={v => setM({ group_weights: { ...m.group_weights, b: v } })} min={0} />
          </Row>
          <Row label="Group C (matches 11–15)">
            <NumInput value={m.group_weights.c} onChange={v => setM({ group_weights: { ...m.group_weights, c: v } })} min={0} />
          </Row>
          <Row label="Group D (oldest 5)">
            <NumInput value={m.group_weights.d} onChange={v => setM({ group_weights: { ...m.group_weights, d: v } })} min={0} />
          </Row>
          <div className="mt-1 text-xs text-slate-400">
            Effective divisor: 5 × ({m.group_weights.a} + {m.group_weights.b} + {m.group_weights.c} + {m.group_weights.d}) = {5 * (m.group_weights.a + m.group_weights.b + m.group_weights.c + m.group_weights.d)}
          </div>
        </Subsection>

        <Subsection title="Fall / Tech-Fall Time Buckets (seconds)">
          <p className="text-xs text-slate-400 mb-2">5 upper-bound thresholds separating the 6 time tiers. Pins and tech-falls each use these same breakpoints.</p>
          <div className="flex gap-2 flex-wrap">
            {m.fall_time_buckets_seconds.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-slate-400">T{i + 1}–T{i + 2}</span>
                <NumInput
                  value={v}
                  onChange={nv => {
                    const next = [...m.fall_time_buckets_seconds]
                    next[i] = nv
                    setM({ fall_time_buckets_seconds: next })
                  }}
                  min={0} max={600}
                />
              </div>
            ))}
          </div>
        </Subsection>

        <Subsection title="Expected Outcome Thresholds">
          <p className="text-xs text-slate-400 mb-2">15 score-diff breakpoints (descending) that map hammer score gap to an expected outcome rank (1–15). Must have exactly 15 values.</p>
          <div className="flex gap-1.5 flex-wrap">
            {m.expected_outcome_thresholds.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-slate-400">R{i + 1}</span>
                <input
                  type="number"
                  value={v}
                  min={0}
                  onChange={e => {
                    const next = [...m.expected_outcome_thresholds]
                    next[i] = parseInt(e.target.value) || 0
                    setM({ expected_outcome_thresholds: next })
                  }}
                  className="border border-slate-200 w-14 px-1 py-1 text-sm text-right focus:outline-none focus:border-blue-400"
                />
              </div>
            ))}
          </div>
        </Subsection>

        <Subsection title="Score Rates">
          <Row label="Favored: outperformed expected (per tier above)">
            <NumInput value={m.score_rates.favored_better_per_tier}     onChange={v => setM({ score_rates: { ...m.score_rates, favored_better_per_tier: v } })}     step={0.25} min={0} />
          </Row>
          <Row label="Favored: underperformed expected (per tier below)">
            <NumInput value={m.score_rates.favored_worse_per_tier}      onChange={v => setM({ score_rates: { ...m.score_rates, favored_worse_per_tier: v } })}      step={0.25} min={0} />
          </Row>
          <Row label="Favored: loss to OT (per tier from expected win)">
            <NumInput value={m.score_rates.favored_loss_to_ot_per_tier} onChange={v => setM({ score_rates: { ...m.score_rates, favored_loss_to_ot_per_tier: v } })} step={0.25} min={0} />
          </Row>
          <Row label="Favored: loss past OT (per tier beyond OT loss)">
            <NumInput value={m.score_rates.favored_loss_past_ot_per_tier} onChange={v => setM({ score_rates: { ...m.score_rates, favored_loss_past_ot_per_tier: v } })} step={0.25} min={0} />
          </Row>
          <Row label="Underdog: outperformed expected (per tier above)">
            <NumInput value={m.score_rates.underdog_better_per_tier}    onChange={v => setM({ score_rates: { ...m.score_rates, underdog_better_per_tier: v } })}    step={0.25} min={0} />
          </Row>
          <Row label="Underdog: upset win (per tier into win territory)">
            <NumInput value={m.score_rates.underdog_upset_per_tier}     onChange={v => setM({ score_rates: { ...m.score_rates, underdog_upset_per_tier: v } })}     step={0.25} min={0} />
          </Row>
          <Row label="Underdog: underperformed expected (per tier below)">
            <NumInput value={m.score_rates.underdog_worse_per_tier}     onChange={v => setM({ score_rates: { ...m.score_rates, underdog_worse_per_tier: v } })}     step={0.25} min={0} />
          </Row>
          <Row label="Cap diff (favored wrestler score capped at pre-match when gap ≥)">
            <NumInput value={m.score_rates.cap_diff}                    onChange={v => setM({ score_rates: { ...m.score_rates, cap_diff: v } })}                    min={0} />
          </Row>
        </Subsection>

        <Subsection title="Weight Class Adjustment">
          <p className="text-xs text-slate-400 mb-2">Penalty/bonus when a wrestler competes at a weight other than their primary class.</p>
          <Row label="Up per class (penalty)">
            <NumInput value={m.weight_class_adjustment.up_per_class}   onChange={v => setM({ weight_class_adjustment: { ...m.weight_class_adjustment, up_per_class: v } })}   min={0} />
          </Row>
          <Row label="Down per class (bonus)">
            <NumInput value={m.weight_class_adjustment.down_per_class} onChange={v => setM({ weight_class_adjustment: { ...m.weight_class_adjustment, down_per_class: v } })} min={0} />
          </Row>
        </Subsection>

        <Subsection title="OOS Opponent Score Bands">
          <p className="text-xs text-slate-400 mb-2">Estimated hammer score range for out-of-state opponents, scaled by round depth (lo = early rounds, hi = deep rounds).</p>
          <Row label="20-pt tournament — lo">
            <NumInput value={m.oos_bands.tier_20.lo}    onChange={v => setM({ oos_bands: { ...m.oos_bands, tier_20:    { ...m.oos_bands.tier_20,    lo: v } } })} min={0} />
          </Row>
          <Row label="20-pt tournament — hi">
            <NumInput value={m.oos_bands.tier_20.hi}    onChange={v => setM({ oos_bands: { ...m.oos_bands, tier_20:    { ...m.oos_bands.tier_20,    hi: v } } })} min={0} />
          </Row>
          <Row label="15-pt tournament — lo">
            <NumInput value={m.oos_bands.tier_15.lo}    onChange={v => setM({ oos_bands: { ...m.oos_bands, tier_15:    { ...m.oos_bands.tier_15,    lo: v } } })} min={0} />
          </Row>
          <Row label="15-pt tournament — hi">
            <NumInput value={m.oos_bands.tier_15.hi}    onChange={v => setM({ oos_bands: { ...m.oos_bands, tier_15:    { ...m.oos_bands.tier_15,    hi: v } } })} min={0} />
          </Row>
          <Row label="Other tournament — lo">
            <NumInput value={m.oos_bands.tier_other.lo} onChange={v => setM({ oos_bands: { ...m.oos_bands, tier_other: { ...m.oos_bands.tier_other, lo: v } } })} min={0} />
          </Row>
          <Row label="Other tournament — hi">
            <NumInput value={m.oos_bands.tier_other.hi} onChange={v => setM({ oos_bands: { ...m.oos_bands, tier_other: { ...m.oos_bands.tier_other, hi: v } } })} min={0} />
          </Row>
        </Subsection>

        <Subsection title="Bootstrap &amp; Discovery">
          <Row label="Bootstrap multiplier (bootstrapValue = psBase × multiplier)">
            <NumInput value={m.bootstrap_multiplier}    onChange={v => setM({ bootstrap_multiplier: v })}    step={0.5} min={0} />
          </Row>
          <Row label="PS elevation threshold (only wrestlers with PS below this can be elevated by a win)">
            <NumInput value={m.ps_elevation_threshold} onChange={v => setM({ ps_elevation_threshold: v })} min={0} />
          </Row>
        </Subsection>

      </Section>

      {/* ── Tournaments ────────────────────────────────────────────── */}
      <Section title="Tournaments" subtitle="Tournament component (0–20)">

        <Subsection title="Place Points by Tier">
          <p className="text-xs text-slate-400 mb-1">Points awarded per finish. Rows = tournament point tiers, columns = place finish.</p>
          <PlacePointsTable
            value={t.place_points}
            onChange={pp => setT({ place_points: pp })}
          />
        </Subsection>

        <Subsection title="Component Rules">
          <Row label="Exclude winner below average (1st-place finish can't lower average)">
            <Toggle value={t.exclude_winner_below_avg} onChange={v => setT({ exclude_winner_below_avg: v })} />
            <span className="text-xs text-slate-500">{t.exclude_winner_below_avg ? 'On' : 'Off'}</span>
          </Row>
          <Row label="Component ceiling">
            <NumInput value={t.component_ceiling} onChange={v => setT({ component_ceiling: v })} min={0} max={100} />
          </Row>
        </Subsection>

      </Section>

      {/* ── Postseason ─────────────────────────────────────────────── */}
      <Section title="Postseason" subtitle="Postseason component (0–50)">

        <Subsection title="State Placements">
          <Row label="1st place"><NumInput value={ps.state.place_1}   onChange={v => setPS({ state: { ...ps.state, place_1: v } })}   min={0} /></Row>
          <Row label="2nd place"><NumInput value={ps.state.place_2}   onChange={v => setPS({ state: { ...ps.state, place_2: v } })}   min={0} /></Row>
          <Row label="3rd–4th place"><NumInput value={ps.state.place_3_4} onChange={v => setPS({ state: { ...ps.state, place_3_4: v } })} min={0} /></Row>
          <Row label="5th–6th place"><NumInput value={ps.state.place_5_6} onChange={v => setPS({ state: { ...ps.state, place_5_6: v } })} min={0} /></Row>
          <Row label="7th–8th place"><NumInput value={ps.state.place_7_8} onChange={v => setPS({ state: { ...ps.state, place_7_8: v } })} min={0} /></Row>
          <Row label="Made state — 3+ wins (no placement)"><NumInput value={ps.state.wins_3plus} onChange={v => setPS({ state: { ...ps.state, wins_3plus: v } })} min={0} /></Row>
          <Row label="Made state — 2 wins"><NumInput value={ps.state.wins_2}     onChange={v => setPS({ state: { ...ps.state, wins_2: v } })}     min={0} /></Row>
          <Row label="Made state — 1 win"><NumInput value={ps.state.wins_1}     onChange={v => setPS({ state: { ...ps.state, wins_1: v } })}     min={0} /></Row>
          <Row label="Made state — 0 wins"><NumInput value={ps.state.wins_0}    onChange={v => setPS({ state: { ...ps.state, wins_0: v } })}     min={0} /></Row>
        </Subsection>

        <Subsection title="District Finish">
          <Row label="Champion"><NumInput value={ps.district.champion}  onChange={v => setPS({ district: { ...ps.district, champion: v } })}  min={0} /></Row>
          <Row label="Runner-up"><NumInput value={ps.district.runner_up} onChange={v => setPS({ district: { ...ps.district, runner_up: v } })} min={0} /></Row>
          <Row label="Third place"><NumInput value={ps.district.third}   onChange={v => setPS({ district: { ...ps.district, third: v } })}    min={0} /></Row>
          <Row label="Entry (participant)"><NumInput value={ps.district.entry}   onChange={v => setPS({ district: { ...ps.district, entry: v } })}    min={0} /></Row>
        </Subsection>

        <Subsection title="Component Rules">
          <Row label="Component ceiling">
            <NumInput value={ps.component_ceiling} onChange={v => setPS({ component_ceiling: v })} min={0} max={100} />
          </Row>
        </Subsection>

      </Section>

      {/* ── Component Ceilings ─────────────────────────────────────── */}
      <Section title="Component Ceilings" subtitle="Hard caps applied before summing">
        <Row label="Postseason ceiling"><NumInput value={cc.postseason} onChange={v => setCeil({ postseason: v })} min={0} max={100} /></Row>
        <Row label="Tournament ceiling"><NumInput value={cc.tournament} onChange={v => setCeil({ tournament: v })} min={0} max={100} /></Row>
        <Row label="Match ceiling">    <NumInput value={cc.match}       onChange={v => setCeil({ match: v })}       min={0} max={100} /></Row>
        <div className="mt-2 text-xs text-slate-400">
          Max possible hammer score: {cc.postseason + cc.tournament + cc.match}
        </div>
      </Section>

      {/* ── Ceiling Preview ────────────────────────────────────────── */}
      {(preview || previewing || previewError) && (
        <div className="mt-6 border border-slate-200">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-800">Ceiling Preview</span>
              <span className="ml-3 text-xs text-slate-400">Shows impact of component ceiling changes on current stored scores. Other config changes (match rates, OOS bands, group weights) require a full recalculation to preview.</span>
            </div>
            {preview && (
              <div className="flex gap-4 text-xs shrink-0 ml-4">
                <span className="text-slate-500">Total: <strong className="text-slate-800">{preview.summary.total}</strong></span>
                <span className="text-slate-500">Affected: <strong className={preview.summary.affected > 0 ? 'text-amber-700' : 'text-slate-800'}>{preview.summary.affected}</strong></span>
                {preview.summary.affected > 0 && (
                  <span className="text-slate-500">Avg Δ: <strong className="text-slate-800">{preview.summary.avgDelta > 0 ? '+' : ''}{preview.summary.avgDelta.toFixed(2)}</strong></span>
                )}
              </div>
            )}
          </div>

          {previewing && <p className="text-sm text-slate-400 px-5 py-8 text-center">Running preview…</p>}
          {previewError && <p className="text-sm text-red-600 px-5 py-4">{previewError}</p>}

          {preview && preview.rows.length === 0 && (
            <p className="text-sm text-slate-400 px-5 py-6 text-center">No wrestlers affected by the ceiling changes in this draft config.</p>
          )}

          {preview && preview.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="px-4 py-2 text-left text-slate-500 font-semibold">Wrestler</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Wt</th>
                    <th className="px-3 py-2 text-right text-slate-400 font-normal" colSpan={4}>Current</th>
                    <th className="px-3 py-2 text-right text-slate-400 font-normal" colSpan={4}>Preview</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Δ</th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                    <th className="px-4 py-1" />
                    <th className="px-3 py-1" />
                    <th className="px-3 py-1 text-right font-normal">PS</th>
                    <th className="px-3 py-1 text-right font-normal">Tour</th>
                    <th className="px-3 py-1 text-right font-normal">Match</th>
                    <th className="px-3 py-1 text-right font-semibold text-slate-500">Total</th>
                    <th className="px-3 py-1 text-right font-normal">PS</th>
                    <th className="px-3 py-1 text-right font-normal">Tour</th>
                    <th className="px-3 py-1 text-right font-normal">Match</th>
                    <th className="px-3 py-1 text-right font-semibold text-slate-500">Total</th>
                    <th className="px-3 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map(r => {
                    const changed = r.delta !== 0
                    return (
                      <tr key={r.wrestler_id} className={`border-b border-slate-100 ${changed ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-4 py-1.5 font-medium text-slate-800">{r.last_name}, {r.first_name}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">{r.weight_class ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">{r.cur_ps.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">{r.cur_tour.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">{r.cur_match.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{r.cur_total.toFixed(2)}</td>
                        <td className={`px-3 py-1.5 text-right ${r.pre_ps < r.cur_ps ? 'text-amber-700' : 'text-slate-500'}`}>{r.pre_ps.toFixed(1)}</td>
                        <td className={`px-3 py-1.5 text-right ${r.pre_tour < r.cur_tour ? 'text-amber-700' : 'text-slate-500'}`}>{r.pre_tour.toFixed(1)}</td>
                        <td className={`px-3 py-1.5 text-right ${r.pre_match < r.cur_match ? 'text-amber-700' : 'text-slate-500'}`}>{r.pre_match.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{r.pre_total.toFixed(2)}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${r.delta < 0 ? 'text-red-600' : r.delta > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          {r.delta === 0 ? '—' : `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(2)}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {preview.rows.length === 100 && (
                <p className="text-xs text-slate-400 px-5 py-3 border-t border-slate-100">Showing top 100 movers. Save config and recalculate to apply changes to all {preview.summary.total} wrestlers.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Save bar ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 mt-6 px-0 py-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Saved — takes effect on next recalculation.</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing}
            className="border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            {previewing ? 'Running…' : 'Preview Impact'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-slate-900 text-white text-sm font-medium px-5 py-2 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  )
}
