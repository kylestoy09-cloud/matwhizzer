'use client'
// Aesthetic Tool: a live preview of the standard page frame using the real shared components
// (SitePageHeader, NumberTileGrid) with adjustable colors, font and sizes. Preview only: approved
// settings are saved (Save → site_aesthetic_versions); the newest save is the look in effect, loaded
// here on open and read by the public pages once the standard look goes live.

import { useEffect, useState } from 'react'
import { SitePageHeader } from '@/components/site/SitePageHeader'
import { MockSite, SUMMARY_DEFAULTS, type SummaryKey } from './MockSite'
import { SiteTabs } from '@/components/site/SiteTabs'
import { NumberTileGrid, type NumberTile } from '@/components/site/NumberTileGrid'
import { BOYS_REGION_BG, GIRLS_REGION_BG, regionTile, boysRegionOfDistrict, girlsRegionOfDistrict, STENCIL_FONTS, type StencilFont } from '@/lib/siteTheme'

// The tool's fonts load in the browser from Google Fonts when the page opens (not next/font, which
// downloads them during the build: a failed download there broke a site deploy on 2026-11-07).
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Stardos+Stencil:wght@400;700&family=Saira+Stencil+One&family=Big+Shoulders+Stencil:wght@700&family=Allerta+Stencil&family=Oswald:wght@600;700&family=Bebas+Neue&family=Barlow+Condensed:wght@600;700&family=Archivo+Black&family=Roboto+Condensed:wght@700&display=swap'
const fam = (name: string) => `'${name}', sans-serif`
// every font the tool can use for page titles: the site's default plus the stencils and display fonts
const TITLE_FONTS: Record<string, string | undefined> = {
  'Site default': undefined,
  'Stardos Stencil': fam('Stardos Stencil'),
  'Saira Stencil One': fam('Saira Stencil One'),
  'Big Shoulders Stencil': fam('Big Shoulders Stencil'),
  'Allerta Stencil': fam('Allerta Stencil'),
  'Oswald': fam('Oswald'),
  'Bebas Neue': fam('Bebas Neue'),
  'Barlow Condensed': fam('Barlow Condensed'),
  'Archivo Black': fam('Archivo Black'),
  'Roboto Condensed': fam('Roboto Condensed'),
}
const FONT_FAMILY: Record<StencilFont, string> = {
  'Stardos Stencil': fam('Stardos Stencil'),
  'Saira Stencil One': fam('Saira Stencil One'),
  'Big Shoulders Stencil': fam('Big Shoulders Stencil'),
  'Allerta Stencil': fam('Allerta Stencil'),
}

type Settings = {
  boys: Record<number, string>
  girls: Record<number, string>
  boysOddFg: string | null    // null = the rule (region 8's gray / region 7's navy)
  boysEvenFg: string | null
  font: StencilFont
  titleFont: string
  titleSize: number
  summaries: Record<SummaryKey, string>
  size: number
  radius: number
  border: boolean
  showLogo: boolean
  headerLayout: 'live' | 'proposed'
}

const DEFAULTS: Settings = {
  boys: { ...BOYS_REGION_BG }, girls: { ...GIRLS_REGION_BG },
  boysOddFg: null, boysEvenFg: null,
  font: 'Saira Stencil One', titleFont: 'Site default', titleSize: 24, summaries: { ...SUMMARY_DEFAULTS }, size: 72, radius: 0, border: true, showLogo: false, headerLayout: 'proposed',
}

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-7 w-9 cursor-pointer border border-slate-300 bg-white p-0" />
      <span className="w-16">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-20 border border-slate-300 px-1 py-0.5 font-mono text-[11px]" />
    </label>
  )
}

export function AestheticClient() {
  const [s, setS] = useState<Settings>(DEFAULTS)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'site' | 'components'>('site')
  const [phone, setPhone] = useState(false)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(p => ({ ...p, [k]: v }))

  // saved looks: the newest is in effect; a saved look is merged over the defaults, so settings added
  // to the tool later get their default until saved
  type Saved = { id: number; note: string | null; saved_by: string | null; created_at: string }
  const [saved, setSaved] = useState<Settings | null>(null)
  const [savedMeta, setSavedMeta] = useState<Saved | null>(null)
  const [history, setHistory] = useState<Saved[]>([])
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const merge = (x: Partial<Settings> | null | undefined): Settings => ({ ...DEFAULTS, ...(x ?? {}), summaries: { ...DEFAULTS.summaries, ...(x?.summaries ?? {}) } })
  const apply = (ok: boolean, j: { error?: string; history?: Saved[]; current?: (Saved & { settings: Partial<Settings> }) | null }) => {
    if (!ok) { setStatus(j.error ?? 'Could not load the saved look'); return }
    setHistory(j.history ?? [])
    if (j.current) { const m = merge(j.current.settings); setSaved(m); setS(m); setSavedMeta(j.current) } else { setSaved(null); setSavedMeta(null) }
  }
  const fetchSaved = () => fetch('/api/admin/aesthetic').then(r => r.json().then(j => ({ ok: r.ok, j })))
  const load = async () => { const { ok, j } = await fetchSaved(); apply(ok, j) }
  useEffect(() => {
    let alive = true
    fetchSaved().then(({ ok, j }) => { if (alive) apply(ok, j) })
    return () => { alive = false }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(s) !== JSON.stringify(saved ?? DEFAULTS)
  const save = async () => {
    setStatus('Saving…')
    const r = await fetch('/api/admin/aesthetic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ settings: s, note }) })
    const j = await r.json()
    if (!r.ok) { setStatus(j.error ?? 'Save failed'); return }
    setNote(''); setStatus('Saved'); await load()
  }
  const loadVersion = async (id: number) => {
    const r = await fetch(`/api/admin/aesthetic?id=${id}`); const j = await r.json()
    if (r.ok && j.version) { setS(merge(j.version.settings)); setStatus(`Loaded the save from ${new Date(j.version.created_at).toLocaleString()} — Save to make it the look in effect`) }
  }
  const fontFamily = FONT_FAMILY[s.font]
  const border = s.border ? '1px solid #0f172a' : 'none'

  const boysTile = (region: number) => {
    const t = regionTile(s.boys, region)
    return { bg: t.bg, fg: region % 2 === 1 ? (s.boysOddFg ?? t.fg) : (s.boysEvenFg ?? t.fg) }
  }
  const girlsTile = (region: number) => regionTile(s.girls, region)

  const boysRegions: NumberTile[] = Array.from({ length: 8 }, (_, i) => ({ key: i + 1, label: String(i + 1), ...boysTile(i + 1) }))
  const boysDistricts: NumberTile[] = Array.from({ length: 32 }, (_, i) => ({ key: i + 1, label: String(i + 1), ...boysTile(boysRegionOfDistrict(i + 1)) }))
  const girlsRegions: NumberTile[] = Array.from({ length: 4 }, (_, i) => ({ key: i + 1, label: String(i + 1), ...girlsTile(i + 1) }))
  const girlsDistricts: NumberTile[] = Array.from({ length: 12 }, (_, i) => ({ key: i + 1, label: String(i + 1), ...girlsTile(girlsRegionOfDistrict(i + 1)) }))
  const groups: NumberTile[] = ['North I G1', 'North I G2', 'North I G3', 'North II G1', 'Central G2', 'South G5'].map((g, i) => ({ key: g, label: g, ...boysTile([1, 2, 3, 4, 5, 6][i]) }))

  const settingsJson = JSON.stringify({ ...s, fontFamilyNote: s.font }, null, 2)
  const copy = async () => { try { await navigator.clipboard.writeText(settingsJson); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ } }

  const seasonPicker = (
    <select className="bg-amber-50 border border-amber-300 font-semibold text-amber-800 text-sm py-0.5 pl-2 pr-2"><option>Current season</option><option>Previous season</option></select>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <link rel="stylesheet" href={FONTS_CSS} precedence="default" />
      {/* ── Controls ── */}
      <aside className="space-y-5 lg:sticky lg:top-4 self-start border border-slate-200 bg-white p-4">
        <div className="space-y-2 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wide text-slate-500">Saved look</span>
            <span className={dirty ? 'font-semibold text-amber-700' : 'text-emerald-700'}>{dirty ? 'Unsaved changes' : 'Saved'}</span>
          </div>
          <p className="text-[11px] text-slate-500">{savedMeta ? `In effect: saved ${new Date(savedMeta.created_at).toLocaleString()}${savedMeta.saved_by ? ` by ${savedMeta.saved_by}` : ''}${savedMeta.note ? ` — ${savedMeta.note}` : ''}` : 'Nothing saved yet: showing the starting look.'}</p>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note for this save (optional)" className="block w-full border border-slate-300 px-2 py-1 text-xs" />
          <div className="flex gap-2">
            <button onClick={save} disabled={!dirty} className="flex-1 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40">Save</button>
            <button onClick={() => setS(saved ?? DEFAULTS)} disabled={!dirty} className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Revert</button>
          </div>
          {status && <p className="text-[11px] text-slate-600">{status}</p>}
          {history.length > 1 && (
            <details className="text-[11px] text-slate-600">
              <summary className="cursor-pointer">History ({history.length})</summary>
              <ul className="mt-1 space-y-0.5">
                {history.map(h => (
                  <li key={h.id}><button onClick={() => loadVersion(h.id)} className="text-left hover:underline">{new Date(h.created_at).toLocaleString()}{h.note ? ` — ${h.note}` : ''}</button></li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Boys regions</h2>
          <div className="space-y-1">
            {[1, 3, 5, 7, 2, 4, 6, 8].map(r => <Swatch key={r} label={`Region ${r}`} value={s.boys[r]} onChange={v => set('boys', { ...s.boys, [r]: v })} />)}
          </div>
          <div className="mt-2 space-y-1">
            <Swatch label="# on navy" value={s.boysOddFg ?? s.boys[8]} onChange={v => set('boysOddFg', v)} />
            <Swatch label="# on gray" value={s.boysEvenFg ?? s.boys[7]} onChange={v => set('boysEvenFg', v)} />
            <p className="text-[11px] text-slate-400">Numbers follow regions 8 and 7 until changed here.</p>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Girls regions</h2>
          <div className="space-y-1">
            {[1, 3, 2, 4].map(r => <Swatch key={r} label={`Region ${r}`} value={s.girls[r]} onChange={v => set('girls', { ...s.girls, [r]: v })} />)}
          </div>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Numbers and tiles</h2>
          <label className="block">Stencil font
            <select value={s.font} onChange={e => set('font', e.target.value as StencilFont)} className="mt-1 block w-full border border-slate-300 px-1 py-1">
              {STENCIL_FONTS.map(f => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="block">Tile height: {s.size}px<input type="range" min={44} max={110} value={s.size} onChange={e => set('size', Number(e.target.value))} className="block w-full" /></label>
          <label className="block">Corner radius: {s.radius}px<input type="range" min={0} max={20} value={s.radius} onChange={e => set('radius', Number(e.target.value))} className="block w-full" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.border} onChange={e => set('border', e.target.checked)} /> Black tile border</label>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Page header</h2>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.showLogo} onChange={e => set('showLogo', e.target.checked)} /> Small logo above the title</label>
          <label className="block">Site header
            <select value={s.headerLayout} onChange={e => set('headerLayout', e.target.value as Settings['headerLayout'])} className="mt-1 block w-full border border-slate-300 px-1 py-1">
              <option value="proposed">Proposed: hamburger left of logo, Boys / Girls left of search</option>
              <option value="live">Live: as on the site now</option>
            </select>
          </label>
          <label className="block">Title font
            <select value={s.titleFont} onChange={e => set('titleFont', e.target.value)} className="mt-1 block w-full border border-slate-300 px-1 py-1">
              {Object.keys(TITLE_FONTS).map(f => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="block">Title size: {s.titleSize}px<input type="range" min={16} max={48} value={s.titleSize} onChange={e => set('titleSize', Number(e.target.value))} className="block w-full" /></label>
        </div>
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-500">Page summaries</summary>
          <div className="mt-2 space-y-2">
            {(Object.keys(SUMMARY_DEFAULTS) as SummaryKey[]).map(k => (
              <label key={k} className="block">{k}
                <textarea value={s.summaries[k]} rows={2} onChange={e => set('summaries', { ...s.summaries, [k]: e.target.value })} className="mt-0.5 block w-full border border-slate-300 px-1 py-0.5" />
              </label>
            ))}
          </div>
        </details>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{copied ? 'Copied' : 'Copy settings'}</button>
          <button onClick={() => setS(DEFAULTS)} className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Defaults</button>
        </div>
      </aside>

      {/* ── Preview: the mock site (default) or the component sheet ── */}
      <div>
      <div className="mb-3 inline-flex border border-slate-300">
        {([['site', 'Mock site'], ['components', 'Components']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`px-3 py-1 text-xs font-semibold ${view === k ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      {view === 'site' && (
        <label className="ml-3 inline-flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={phone} onChange={e => setPhone(e.target.checked)} /> Phone width (390px)</label>
      )}
      {view === 'site' ? (
        <div style={{ maxWidth: phone ? 390 : undefined }}>
        <MockSite look={{ fontFamily, titleFontFamily: TITLE_FONTS[s.titleFont], titleSize: s.titleSize, summaries: s.summaries, size: s.size, radius: s.radius, border, showLogo: s.showLogo, headerLayout: s.headerLayout, boysTile, girlsTile }} />
        </div>
      ) : (
      <div className="space-y-10 border border-slate-200 bg-white p-6">
        <section>
          <SitePageHeader title="Boys Region Brackets" picker={seasonPicker} summary="NJSIAA · select a region" tabs={<SiteTabs items={[{ key: 'group', label: 'Group' }, { key: 'conference', label: 'Conference' }]} active="group" />} showLogo={s.showLogo} titleFontFamily={TITLE_FONTS[s.titleFont]} titleSize={s.titleSize} />
          <NumberTileGrid tiles={boysRegions} fontFamily={fontFamily} size={s.size} radius={s.radius} border={border} minWidth={s.size} />
        </section>
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Boys districts (by region)</h3>
          <NumberTileGrid tiles={boysDistricts} fontFamily={fontFamily} size={Math.round(s.size * 0.75)} radius={s.radius} border={border} groupSize={4} />
        </section>
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Girls regions</h3>
            <NumberTileGrid tiles={girlsRegions} fontFamily={fontFamily} size={s.size} radius={s.radius} border={border} minWidth={s.size} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Girls districts (by region)</h3>
            <NumberTileGrid tiles={girlsDistricts} fontFamily={fontFamily} size={Math.round(s.size * 0.75)} radius={s.radius} border={border} groupSize={3} />
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Group standings buttons</h3>
          <NumberTileGrid tiles={groups} fontFamily={fontFamily} size={Math.round(s.size * 0.7)} radius={s.radius} border={border} minWidth={130} />
        </section>
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Sample table</h3>
          <div className="overflow-x-auto border border-black">
            <table className="w-full text-[13px]">
              <thead><tr className="bg-slate-900 text-white">{['#', 'School', 'W-L', 'PP'].map(h => <th key={h} className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {[['1', 'Bergen Catholic', '18-0', '64.2'], ['2', 'St Joseph Regional', '16-2', '61.9'], ['3', 'Delbarton', '15-3', '58.0']].map((r, i) => (
                  <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>{r.map((c, j) => <td key={j} className="px-3 py-1">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}
      </div>
    </div>
  )
}
