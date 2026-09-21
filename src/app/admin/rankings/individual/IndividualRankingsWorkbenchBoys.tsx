'use client'

const GENDER = 'M' as const

import { useState, useEffect, useMemo } from 'react'
import { WorkbenchTableBoys as WorkbenchTable } from './WorkbenchTableBoys'
import { UpsetReviewBoys as UpsetReview } from './UpsetReviewBoys'

// ── Constants ────────────────────────────────────────────────────────────────

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

// 4 NJ wrestling sections — stable, doesn't change season to season
const NJ_SECTIONS = ['North I', 'North II', 'Central', 'South']


// Totals for completion meters (boys)
const DISTRICT_TOTAL = 32
const REGION_TOTAL   = 8
const SECTION_TOTAL  = 4


// ── Types ────────────────────────────────────────────────────────────────────

type District = { id: number; name: string }
type Region   = { id: number; name: string }
type DbWeek   = { id: number; week_number: number; week_date: string }
type CompletionRow = { weight_class: number; stage: string; stage_entity: string }
type Stage = 'district' | 'region' | 'section' | 'state'

// ── Sub-components ───────────────────────────────────────────────────────────

function MeterBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  const done = value >= total && total > 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`text-xs tabular-nums font-mono ${done ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
          {value} / {total}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-emerald-500' : 'bg-slate-700'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StageDropdown({
  label, options, value, onChange, locked, meterValue, meterTotal,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  locked: boolean
  meterValue: number
  meterTotal: number
}) {
  const done = meterValue >= meterTotal && meterTotal > 0
  return (
    <div className="flex-1 min-w-0">
      <MeterBar value={meterValue} total={meterTotal} label={label} />
      <div className="mt-2">
        {label === 'State' ? (
          <button
            disabled={locked}
            onClick={() => onChange('state')}
            className={`w-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              locked
                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                : done
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
            }`}
          >
            {locked ? '🔒 State' : done ? '✓ State' : 'State'}
          </button>
        ) : (
          <select
            disabled={locked}
            value={value}
            onChange={e => onChange(e.target.value)}
            className={`w-full px-2 py-1.5 text-xs border rounded transition-colors focus:outline-none ${
              locked
                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 focus:ring-1 focus:ring-slate-400'
            }`}
          >
            <option value="">
              {locked ? '🔒 ' : ''}— pick {label.toLowerCase().replace(/s$/, '')} —
            </option>
            {!locked && options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function IndividualRankingsWorkbenchBoys({ season }: { season: string }) {
  const weights = WEIGHTS
  const districtTotal = DISTRICT_TOTAL
  const regionTotal = REGION_TOTAL
  const sectionTotal = SECTION_TOTAL

  // Total completable entries = (districts + regions + sections + 1 state) × weights
  const grandTotal = (districtTotal + regionTotal + sectionTotal + 1) * weights.length

  // Bootstrap data
  const [districts,   setDistricts]   = useState<District[]>([])
  const [regions,     setRegions]     = useState<Region[]>([])
  const [dbWeeks,     setDbWeeks]     = useState<DbWeek[]>([])
  const [bootstrapOk, setBootstrapOk] = useState(false)

  // Selections
  const todayStr = new Date().toISOString().slice(0, 10)
  // Ranking weeks come from individual_ranking_weeks for the season in progress
  const weeks = useMemo(() => dbWeeks.map(w => ({
    number: w.week_number,
    date:   w.week_date,
    label:  new Date(w.week_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  })), [dbWeeks])
  const defaultWeekNum = weeks.find(w => w.date >= todayStr)?.number ?? weeks[weeks.length - 1]?.number ?? 1
  const [selectedWeekNum,  setSelectedWeekNum]  = useState(defaultWeekNum)
  // Weeks load asynchronously — jump to the upcoming week once they arrive
  useEffect(() => { setSelectedWeekNum(defaultWeekNum) }, [defaultWeekNum])
  const [selectedWeight,   setSelectedWeight]   = useState<number | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedRegion,   setSelectedRegion]   = useState('')
  const [selectedSection,  setSelectedSection]  = useState('')
  const [selectedStage,    setSelectedStage]    = useState<Stage | null>(null)

  // Active tab within weight view
  const [activeTab, setActiveTab] = useState<'upsets' | 'rankings'>('upsets')

  // Completion data (all weights for selected week)
  const [completionRows, setCompletionRows] = useState<CompletionRow[]>([])
  const [completionLoading, setCompletionLoading] = useState(false)
  // Bump this to re-fetch completion after a save
  const [completionNonce, setCompletionNonce] = useState(0)

  // Resolved DB week ID for current selection (null when weeks not yet seeded)
  const currentDbWeek = useMemo(
    () => dbWeeks.find(w => w.week_number === selectedWeekNum) ?? null,
    [dbWeeks, selectedWeekNum],
  )

  // ── Bootstrap fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    setBootstrapOk(false)
    setDistricts([])
    setRegions([])
    setDbWeeks([])
    fetch(`/api/admin/individual-rankings/bootstrap?gender=${GENDER}`)
      .then(r => r.json())
      .then(d => {
        setDistricts(d.districts ?? [])
        setRegions(d.regions ?? [])
        setDbWeeks(d.weeks ?? [])
        setBootstrapOk(true)
      })
      .catch(() => setBootstrapOk(true))
  }, [])

  // ── Completion fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    setCompletionRows([])
    if (!currentDbWeek) return
    setCompletionLoading(true)
    fetch(`/api/admin/individual-rankings/completion?gender=${GENDER}&week_id=${currentDbWeek.id}`)
      .then(r => r.json())
      .then(d => setCompletionRows(d.rows ?? []))
      .catch(() => {})
      .finally(() => setCompletionLoading(false))
  }, [ currentDbWeek, completionNonce])

  // Reset stage selections and tab when weight or week changes
  useEffect(() => {
    setSelectedDistrict('')
    setSelectedRegion('')
    setSelectedSection('')
    setSelectedStage(null)
    setActiveTab('upsets')
  }, [selectedWeight, selectedWeekNum, GENDER])

  // ── Derived completion counts ────────────────────────────────────────────

  // Master meter: all weights combined
  const masterDone = completionRows.length

  // Per-weight sub-meters (filtered to selected weight)
  const weightRows = useMemo(
    () => selectedWeight != null
      ? completionRows.filter(r => r.weight_class === selectedWeight)
      : [],
    [completionRows, selectedWeight],
  )

  const districtsDone = weightRows.filter(r => r.stage === 'district').length
  const regionsDone   = weightRows.filter(r => r.stage === 'region').length
  const sectionsDone  = weightRows.filter(r => r.stage === 'section').length
  const stateDone     = weightRows.some(r => r.stage === 'state') ? 1 : 0

  const regionsLocked  = districtsDone < districtTotal
  const sectionsLocked = regionsDone   < regionTotal
  const stateLocked    = sectionsDone  < sectionTotal

  // ── Stage selection handlers ─────────────────────────────────────────────

  function handleDistrictChange(val: string) {
    setSelectedDistrict(val)
    setSelectedStage(val ? 'district' : null)
    setSelectedRegion('')
    setSelectedSection('')
  }

  function handleRegionChange(val: string) {
    setSelectedRegion(val)
    setSelectedStage(val ? 'region' : null)
    setSelectedDistrict('')
    setSelectedSection('')
  }

  function handleSectionChange(val: string) {
    setSelectedSection(val)
    setSelectedStage(val ? 'section' : null)
    setSelectedDistrict('')
    setSelectedRegion('')
  }

  function handleStateSelect() {
    if (stateLocked) return
    setSelectedStage('state')
    setSelectedDistrict('')
    setSelectedRegion('')
    setSelectedSection('')
  }

  const weeksNotSeeded = bootstrapOk && dbWeeks.length === 0

  return (
    <div className="space-y-6">

      {/* ── Week selector ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Week</p>
        <div className="flex flex-wrap gap-1.5">
          {weeks.map(w => {
            const isActive = selectedWeekNum === w.number
            const isPast   = w.date < todayStr
            const isNext   = !isPast && w.date >= todayStr && w.number === defaultWeekNum
            return (
              <button
                key={w.number}
                onClick={() => setSelectedWeekNum(w.number)}
                className={`relative px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : isPast
                      ? 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
                }`}
              >
                {w.label}
                {isNext && !isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            )
          })}
        </div>
        {weeksNotSeeded && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠ Season 3 not yet seeded — run <code className="font-mono">20260829_individual_ranking_season3_seed.sql</code> after Season 3 rollover. Rankings will be view-only until then.
          </p>
        )}
      </div>

      {/* ── Master meter bar ────────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Overall Progress — Week {selectedWeekNum}
            {completionLoading && <span className="ml-2 text-slate-300 font-normal normal-case">loading…</span>}
          </p>
          <span className={`text-xs tabular-nums font-mono font-semibold ${masterDone >= grandTotal && grandTotal > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
            {masterDone} / {grandTotal}
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${masterDone >= grandTotal && grandTotal > 0 ? 'bg-emerald-500' : 'bg-slate-800'}`}
            style={{ width: grandTotal > 0 ? `${Math.min(100, (masterDone / grandTotal) * 100)}%` : '0%' }}
          />
        </div>
      </div>

      {/* ── Weight class buttons ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Weight Class</p>
        <div className="flex flex-wrap gap-1.5">
          {weights.map(w => (
            <button
              key={w}
              onClick={() => setSelectedWeight(prev => prev === w ? null : w)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                selectedWeight === w
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* ── Weight view: Upsets | Rankings tabs ─────────────────────────── */}
      {selectedWeight != null && (
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200">
            {(['upsets', 'rankings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Upsets tab ─────────────────────────────────────────────────── */}
          {activeTab === 'upsets' && (
            <UpsetReview
              weight={selectedWeight}
              weekId={currentDbWeek?.id ?? null}
              weekNumber={currentDbWeek?.week_number ?? 1}
              season={season}
              onSaved={() => setCompletionNonce(n => n + 1)}
            />
          )}

          {/* ── Rankings tab ───────────────────────────────────────────────── */}
          {activeTab === 'rankings' && (
            <div className="space-y-4">
              {/* Stage row */}
              <div className="border border-slate-200 bg-slate-50 p-4 space-y-3">
                {/* Sub-meters */}
                <div className="grid grid-cols-4 gap-6">
                  <MeterBar value={districtsDone} total={districtTotal} label="Districts" />
                  <MeterBar value={regionsDone}   total={regionTotal}   label="Regions"   />
                  <MeterBar value={sectionsDone}  total={sectionTotal}  label="Sections"  />
                  <MeterBar value={stateDone}     total={1}             label="State"     />
                </div>

                {/* Stage dropdowns */}
                <div className="grid grid-cols-4 gap-3">
                  <StageDropdown
                    label="Districts"
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    locked={false}
                    meterValue={districtsDone}
                    meterTotal={districtTotal}
                    options={districts.map(d => ({ value: String(d.id), label: d.name }))}
                  />
                  <StageDropdown
                    label="Regions"
                    value={selectedRegion}
                    onChange={handleRegionChange}
                    locked={regionsLocked}
                    meterValue={regionsDone}
                    meterTotal={regionTotal}
                    options={regions.map(r => ({ value: String(r.id), label: r.name }))}
                  />
                  <StageDropdown
                    label="Sections"
                    value={selectedSection}
                    onChange={handleSectionChange}
                    locked={sectionsLocked}
                    meterValue={sectionsDone}
                    meterTotal={sectionTotal}
                    options={NJ_SECTIONS.map(s => ({ value: s, label: s }))}
                  />
                  <StageDropdown
                    label="State"
                    value={selectedStage === 'state' ? 'state' : ''}
                    onChange={handleStateSelect}
                    locked={stateLocked}
                    meterValue={stateDone}
                    meterTotal={1}
                    options={[]}
                  />
                </div>
              </div>

              {/* Workbench table */}
              {selectedStage != null ? (() => {
                const entity = selectedStage === 'district' ? selectedDistrict
                  : selectedStage === 'region'  ? selectedRegion
                  : selectedStage === 'section' ? selectedSection
                  : 'state'
                const entityLabel = selectedStage === 'district'
                  ? (districts.find(d => String(d.id) === selectedDistrict)?.name ?? selectedDistrict)
                  : selectedStage === 'region'
                    ? (regions.find(r => String(r.id) === selectedRegion)?.name ?? selectedRegion)
                    : selectedStage === 'section'
                      ? selectedSection
                      : 'State'
                return (
                  <WorkbenchTable
                    weight={selectedWeight}
                    stage={selectedStage}
                    entity={entity}
                    entityLabel={entityLabel}
                    season={season}
                    weekId={currentDbWeek?.id ?? null}
                    onSaved={() => setCompletionNonce(n => n + 1)}
                  />
                )
              })() : (
                <p className="text-sm text-slate-400 text-center py-4">
                  Select a district, region, section, or state above to open the ranking workbench.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedWeight == null && (
        <p className="text-sm text-slate-400 text-center py-4">
          Select a weight class to begin.
        </p>
      )}
    </div>
  )
}
