'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type DistrictDef = { id: number; name: string }
type RegionDef   = { id: number; name: string }
type SchoolDef   = { id: number; display_name: string }

type PreviewRow = {
  school_id: number
  csv_name: string
  db_name: string | null
  district_id: number | null
  district_name: string
  region_id: number | null
  region_name: string
  error: string | null
}

type ApiMeta = {
  seasonId: number | null
  districts: DistrictDef[]
  regions: RegionDef[]
  schools: SchoolDef[]
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

// Boys and girls write their own alignment tables through their own routes
export function AlignmentImportClient({ gender }: { gender: 'M' | 'F' }) {
  const api   = gender === 'F' ? '/api/admin/alignment-import-girls' : '/api/admin/alignment-import'
  const label = gender === 'F' ? 'girls' : 'boys'
  const fileRef = useRef<HTMLInputElement>(null)

  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)

  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    fetch(api)
      .then(r => r.json())
      .then(setMeta)
      .catch(() => setMetaError('Failed to load districts/regions from DB'))
  }, [api])

  const handleFile = useCallback((file: File) => {
    if (!meta) return
    setFileName(file.name)
    setPreview(null)
    setParseError(null)
    setImportResult(null)
    setImportError(null)

    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCsv(text)

      if (!rows.length) {
        setParseError('No data rows found in CSV.')
        return
      }

      // Validate required columns
      const first = rows[0]
      const missing = ['school_id', 'Region', 'District', 'School'].filter(c => !(c in first))
      if (missing.length) {
        setParseError(`Missing columns: ${missing.join(', ')}. Expected: school_id, Region, District, School`)
        return
      }

      const schoolMap = new Map<number, string>()
      for (const s of meta.schools) schoolMap.set(s.id, s.display_name)

      const districtMap = new Map<string, number>()
      for (const d of meta.districts) districtMap.set(d.name.toLowerCase(), d.id)

      const regionMap = new Map<string, number>()
      for (const r of meta.regions) regionMap.set(r.name.toLowerCase(), r.id)

      const previewRows: PreviewRow[] = rows.map(row => {
        const school_id = parseInt(row['school_id'], 10)
        const csv_name = row['School']?.trim() ?? ''
        const district_name = row['District']?.trim() ?? ''
        const region_name = row['Region']?.trim() ?? ''

        const db_name = isNaN(school_id) ? null : (schoolMap.get(school_id) ?? null)
        const district_id = districtMap.get(district_name.toLowerCase()) ?? null
        const region_id   = regionMap.get(region_name.toLowerCase()) ?? null

        let error: string | null = null
        if (isNaN(school_id)) error = 'Invalid school_id'
        else if (!db_name) error = `school_id ${school_id} not found in DB`
        else if (!district_id) error = `Unknown district: "${district_name}"`
        else if (!region_id)   error = `Unknown region: "${region_name}"`

        return { school_id, csv_name, db_name, district_id, district_name, region_id, region_name, error }
      })

      setPreview(previewRows)
    }
    reader.readAsText(file)
  }, [meta])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const errorRows  = preview?.filter(r => r.error) ?? []
  const validRows  = preview?.filter(r => !r.error) ?? []
  const canImport  = validRows.length > 0 && meta?.seasonId != null

  async function doImport() {
    if (!canImport || !meta?.seasonId) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: meta.seasonId,
          rows: validRows.map(r => ({
            school_id: r.school_id,
            district_id: r.district_id!,
            region_id: r.region_id!,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImportResult({ imported: data.imported })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setImporting(false)
    }
  }

  if (metaError) {
    return <div className="p-4 text-red-600 bg-red-50 rounded">{metaError}</div>
  }

  if (!meta) {
    return <div className="p-4 text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Season badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Target season:</span>
        {meta.seasonId
          ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Season {meta.seasonId} ({label} preseason)</span>
          : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">No active {label} preseason found</span>
        }
      </div>

      {/* Drop zone */}
      {!importResult && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleInput} />
          <p className="text-sm font-medium text-slate-700">
            {fileName ? `Loaded: ${fileName}` : 'Drop CSV here or click to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Required columns: school_id, Region, District, School
          </p>
        </div>
      )}

      {parseError && (
        <div className="p-3 text-red-700 bg-red-50 border border-red-200 rounded text-sm">{parseError}</div>
      )}

      {/* Preview table */}
      {preview && !importResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-slate-700">{preview.length} rows parsed</span>
            {errorRows.length > 0 && (
              <span className="text-red-600 font-medium">{errorRows.length} with errors (will be skipped)</span>
            )}
            {validRows.length > 0 && (
              <span className="text-green-700 font-medium">{validRows.length} ready to import</span>
            )}
          </div>

          {errorRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Errors (skipped)</p>
              {errorRows.map((r, i) => (
                <div key={i} className="text-xs text-red-600 font-mono">
                  ID {r.school_id} &ldquo;{r.csv_name}&rdquo; — {r.error}
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-1 text-left font-semibold text-slate-600">ID</th>
                  <th className="px-3 py-1 text-left font-semibold text-slate-600">DB Name</th>
                  <th className="px-3 py-1 text-left font-semibold text-slate-600">CSV Name</th>
                  <th className="px-3 py-1 text-left font-semibold text-slate-600">District</th>
                  <th className="px-3 py-1 text-left font-semibold text-slate-600">Region</th>
                  <th className="px-3 py-1 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((r, i) => (
                  <tr key={i} className={r.error ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-3 py-1 font-mono text-slate-500">{r.school_id}</td>
                    <td className="px-3 py-1 text-slate-800">{r.db_name ?? <span className="text-red-500">—</span>}</td>
                    <td className="px-3 py-1 text-slate-500">{r.csv_name}</td>
                    <td className="px-3 py-1 text-slate-700">{r.district_name}</td>
                    <td className="px-3 py-1 text-slate-700">{r.region_name}</td>
                    <td className="px-3 py-1">
                      {r.error
                        ? <span className="text-red-600 font-medium">Error</span>
                        : <span className="text-green-700">OK</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={doImport}
              disabled={!canImport || importing}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing…' : `Import ${validRows.length} rows into Season ${meta.seasonId}`}
            </button>
            <button
              onClick={() => { setPreview(null); setFileName(''); if (fileRef.current) fileRef.current.value = '' }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>

          {importError && (
            <div className="p-3 text-red-700 bg-red-50 border border-red-200 rounded text-sm">{importError}</div>
          )}
        </div>
      )}

      {/* Success */}
      {importResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded space-y-2">
          <p className="text-green-800 font-semibold">Import complete</p>
          <p className="text-sm text-green-700">
            {importResult.imported} schools written to <code>{label}_school_districts</code> and <code>{label}_school_regions</code> for Season {meta.seasonId}.
          </p>
          <button
            onClick={() => { setPreview(null); setFileName(''); setImportResult(null); if (fileRef.current) fileRef.current.value = '' }}
            className="mt-2 px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded text-sm hover:bg-green-50"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
