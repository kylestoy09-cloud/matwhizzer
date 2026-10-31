'use client'

import { useState, useCallback, useRef } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { SchoolFlagCard } from '@/app/admin/[side]/import-rtf/SchoolFlagCard'
import { WrestlerFlagCard } from '@/app/admin/[side]/import-rtf/WrestlerFlagCard'
import type { SchoolFlag, WrestlerFlag, SchoolOverride, WrestlerOverride } from '@/app/admin/[side]/import-rtf/types'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

type ParseResult = {
  bouts: unknown[]
  seeds: unknown[]
  school_flags: SchoolFlag[]
  wrestler_flags: WrestlerFlag[]
  existing_id: string | null
  has_existing_bouts: boolean
  bout_count: number
  seed_count: number
  school_count: number
}

type SaveResult = {
  tournament_id: string
  bouts_inserted: number
  seeds_inserted: number
  wrestlers_created: number
  seeds_only?: boolean
  rounds_updated?: number
  rounds_skipped_oos?: number
}

export function CsvImportClient() {
  const { gender } = useAdminGender()
  const fileRef = useRef<HTMLInputElement>(null)

  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [tournamentName, setTournamentName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)

  const [schoolOverrides, setSchoolOverrides] = useState<Record<string, SchoolOverride>>({})
  const [wrestlerOverrides, setWrestlerOverrides] = useState<Record<string, WrestlerOverride>>({})

  const [force, setForce] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleParse = useCallback(async () => {
    if (!csvText.trim()) { setParseError('Upload a CSV file first'); return }
    if (!tournamentName.trim()) { setParseError('Tournament name is required'); return }
    if (!startDate) { setParseError('Start date is required'); return }

    setParsing(true)
    setParseError(null)
    setParsed(null)
    setSchoolOverrides({})
    setWrestlerOverrides({})
    setSaveResult(null)

    try {
      const res = await fetch('/api/admin/csv/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, tournamentName, startDate, endDate: endDate || null, gender }),
      })
      const data = await res.json()
      if (data.error) { setParseError(data.error); return }
      setParsed(data as ParseResult)
      if (data.has_existing_bouts) setForce(false)
    } catch (e) {
      setParseError(String(e))
    } finally {
      setParsing(false)
    }
  }, [csvText, tournamentName, startDate, endDate, gender])

  const handleSave = useCallback(async () => {
    if (!parsed || !csvText) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/csv/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          tournamentName,
          startDate,
          endDate: endDate || null,
          gender,
          force,
          schoolOverrides,
          wrestlerOverrides,
          existingId: parsed.existing_id,
        }),
      })
      const data = await res.json()
      if (data.error) { setSaveError(data.error); return }
      setSaveResult(data as SaveResult)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }, [parsed, csvText, tournamentName, startDate, endDate, gender, force, schoolOverrides, wrestlerOverrides])

  const unresolvedSchoolFlags = parsed?.school_flags.filter(f =>
    !schoolOverrides[f.raw] && f.confidence !== 'exact' && f.confidence !== 'alias'
  ) ?? []

  const unresolvedWrestlerFlags = parsed?.wrestler_flags.filter(f => {
    const ov = wrestlerOverrides[f.key]
    if (!ov) return true
    if (ov.type === 'create' || ov.type === 'existing' || ov.type === 'accept' || ov.type === 'skip') return false
    return true
  }) ?? []

  const canSave = parsed && !saving && unresolvedSchoolFlags.length === 0

  return (
    <div className="space-y-6">
      {/* File upload */}
      <div className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer px-6 py-8 text-center transition-colors"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {fileName ? (
            <div>
              <p className="font-medium text-slate-800">{fileName}</p>
              <p className="text-xs text-slate-400 mt-1">{csvText.split('\n').length - 1} rows · click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-500">Drop CSV file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">TournamentWrestling CSV export</p>
            </div>
          )}
        </div>

        {/* Tournament metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1 space-y-1">
            <label className="block text-xs font-medium text-slate-600">Tournament Name</label>
            <input
              type="text"
              value={tournamentName}
              onChange={e => setTournamentName(e.target.value)}
              placeholder="e.g. Sam Cali Invitational"
              className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">End Date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <button
          onClick={handleParse}
          disabled={parsing || !csvText}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 text-sm"
        >
          {parsing && <Spinner />}
          {parsing ? 'Parsing…' : 'Parse CSV'}
        </button>

        {parseError && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {parseError}
          </div>
        )}
      </div>

      {/* Parse results */}
      {parsed && (
        <>
          {/* Summary */}
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-6 flex-wrap">
              <span className="font-semibold text-slate-800">{tournamentName}</span>
              <span className="text-slate-500">{gender === 'F' ? 'Girls' : 'Boys'}</span>
              <span className="text-slate-500">{parsed.bout_count} bouts</span>
              <span className="text-slate-500">{parsed.seed_count} seeds</span>
              <span className="text-slate-500">{parsed.school_count} schools</span>
              {parsed.existing_id && (
                <span className="text-amber-700 font-medium">
                  {parsed.has_existing_bouts ? '⚠ Already imported' : 'Links to existing tournament'}
                </span>
              )}
            </div>
          </div>

          {/* Force re-import toggle */}
          {parsed.has_existing_bouts && (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm flex items-center gap-3">
              <span className="text-amber-800">This tournament already has bouts in the DB.</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={e => setForce(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-amber-900 font-medium">Force re-import (deletes existing bouts + seeds)</span>
              </label>
            </div>
          )}

          {/* School flags */}
          {parsed.school_flags.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700">
                School Flags ({parsed.school_flags.length})
                {unresolvedSchoolFlags.length > 0 && (
                  <span className="ml-2 text-red-600">{unresolvedSchoolFlags.length} unresolved</span>
                )}
              </h2>
              <div className="space-y-1">
                {parsed.school_flags.map(flag => (
                  <SchoolFlagCard
                    key={flag.raw}
                    flag={flag}
                    override={schoolOverrides[flag.raw]}
                    onOverride={(raw, ov) => setSchoolOverrides(prev => {
                      if (!ov) { const { [raw]: _, ...rest } = prev; return rest }
                      return { ...prev, [raw]: ov }
                    })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Wrestler flags — only shown in primary (full) import mode.
              Secondary mode (existing bouts) uses school+weight+result matching; names are irrelevant. */}
          {parsed.wrestler_flags.length > 0 && !parsed.has_existing_bouts && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700">
                Wrestler Flags ({parsed.wrestler_flags.length})
                {unresolvedWrestlerFlags.length > 0 && (
                  <span className="ml-2 text-slate-500">{unresolvedWrestlerFlags.length} unresolved (optional — new wrestlers will need name input)</span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Names from CSV are first initial + last name. For new wrestlers, enter the full first name before importing.
              </p>
              <div className="space-y-1">
                {parsed.wrestler_flags.map(flag => (
                  <WrestlerFlagCard
                    key={flag.key}
                    flag={flag}
                    override={wrestlerOverrides[flag.key]}
                    onOverride={(key, ov) => setWrestlerOverrides(prev => {
                      if (!ov) { const { [key]: _, ...rest } = prev; return rest }
                      return { ...prev, [key]: ov }
                    })}
                    gender={gender}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            {unresolvedSchoolFlags.length > 0 && (
              <p className="text-sm text-red-600">Resolve all school flags before importing.</p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex items-center gap-2 px-5 py-2 bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 text-sm font-medium"
              >
                {saving && <Spinner />}
                {saving ? 'Importing…' : `Import ${parsed.bout_count} Bouts`}
              </button>
              {!canSave && !saving && unresolvedSchoolFlags.length === 0 && (
                <span className="text-xs text-slate-400">Parse CSV first</span>
              )}
            </div>

            {saveError && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saveResult && (
              <div className="border border-green-200 bg-green-50 px-4 py-4 space-y-1">
                <p className="text-sm font-semibold text-green-800">
                  {saveResult.seeds_only ? 'Seeds imported (bouts preserved from prior import)' : 'Import complete'}
                </p>
                {saveResult.seeds_only && (
                  <p className="text-xs text-amber-700">Tournament already had bouts — seeds written and rounds merged from CSV.</p>
                )}
                <div className="text-xs text-green-700 space-y-0.5">
                  {!saveResult.seeds_only && <p>{saveResult.bouts_inserted} bouts inserted</p>}
                  <p>{saveResult.seeds_inserted} seeds inserted</p>
                  {saveResult.seeds_only && saveResult.rounds_updated != null && (
                    <p>{saveResult.rounds_updated} bout rounds updated</p>
                  )}
                  {saveResult.seeds_only && (saveResult.rounds_skipped_oos ?? 0) > 0 && (
                    <p className="text-amber-600">{saveResult.rounds_skipped_oos} bouts skipped (OOS vs OOS — round unknown)</p>
                  )}
                  {saveResult.wrestlers_created > 0 && (
                    <p>{saveResult.wrestlers_created} new wrestlers created</p>
                  )}
                  <p className="text-green-600 font-mono mt-1">Tournament ID: {saveResult.tournament_id}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
