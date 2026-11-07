'use client'
// Aesthetic Tool: a live preview of the standard page frame using the real shared components
// (SitePageHeader, NumberTileGrid) with adjustable colors, font and sizes. Preview only: approved
// settings are copied out and written into src/lib/siteTheme.ts.

import { useState } from 'react'
import { Stardos_Stencil, Saira_Stencil_One, Big_Shoulders_Stencil, Allerta_Stencil, Oswald, Bebas_Neue, Barlow_Condensed, Archivo_Black, Roboto_Condensed } from 'next/font/google'
import { SitePageHeader } from '@/components/site/SitePageHeader'
import { MockSite, SUMMARY_DEFAULTS, type SummaryKey } from './MockSite'
import { SiteTabs } from '@/components/site/SiteTabs'
import { NumberTileGrid, type NumberTile } from '@/components/site/NumberTileGrid'
import { BOYS_REGION_BG, GIRLS_REGION_BG, regionTile, boysRegionOfDistrict, girlsRegionOfDistrict, STENCIL_FONTS, type StencilFont } from '@/lib/siteTheme'

const stardos = Stardos_Stencil({ subsets: ['latin'], weight: ['400', '700'] })
const saira = Saira_Stencil_One({ subsets: ['latin'], weight: '400' })
const bigShoulders = Big_Shoulders_Stencil({ subsets: ['latin'], weight: ['700'] })
const allerta = Allerta_Stencil({ subsets: ['latin'], weight: '400' })
const oswald = Oswald({ subsets: ['latin'], weight: ['600', '700'] })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400' })
const barlow = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700'] })
const archivo = Archivo_Black({ subsets: ['latin'], weight: '400' })
const robotoCond = Roboto_Condensed({ subsets: ['latin'], weight: ['700'] })
// every font the tool can use for page titles: the site's default plus the stencils and display fonts
const TITLE_FONTS: Record<string, string | undefined> = {
  'Site default': undefined,
  'Stardos Stencil': stardos.style.fontFamily,
  'Saira Stencil One': saira.style.fontFamily,
  'Big Shoulders Stencil': bigShoulders.style.fontFamily,
  'Allerta Stencil': allerta.style.fontFamily,
  'Oswald': oswald.style.fontFamily,
  'Bebas Neue': bebas.style.fontFamily,
  'Barlow Condensed': barlow.style.fontFamily,
  'Archivo Black': archivo.style.fontFamily,
  'Roboto Condensed': robotoCond.style.fontFamily,
}
const FONT_FAMILY: Record<StencilFont, string> = {
  'Stardos Stencil': stardos.style.fontFamily,
  'Saira Stencil One': saira.style.fontFamily,
  'Big Shoulders Stencil': bigShoulders.style.fontFamily,
  'Allerta Stencil': allerta.style.fontFamily,
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
}

const DEFAULTS: Settings = {
  boys: { ...BOYS_REGION_BG }, girls: { ...GIRLS_REGION_BG },
  boysOddFg: null, boysEvenFg: null,
  font: 'Saira Stencil One', titleFont: 'Site default', titleSize: 24, summaries: { ...SUMMARY_DEFAULTS }, size: 72, radius: 0, border: true, showLogo: false,
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
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(p => ({ ...p, [k]: v }))
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
      {/* ── Controls ── */}
      <aside className="space-y-5 lg:sticky lg:top-4 self-start border border-slate-200 bg-white p-4">
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
          <button onClick={copy} className="flex-1 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">{copied ? 'Copied' : 'Copy settings'}</button>
          <button onClick={() => setS(DEFAULTS)} className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
        </div>
      </aside>

      {/* ── Preview: the mock site (default) or the component sheet ── */}
      <div>
      <div className="mb-3 inline-flex border border-slate-300">
        {([['site', 'Mock site'], ['components', 'Components']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`px-3 py-1 text-xs font-semibold ${view === k ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      {view === 'site' ? (
        <MockSite look={{ fontFamily, titleFontFamily: TITLE_FONTS[s.titleFont], titleSize: s.titleSize, summaries: s.summaries, size: s.size, radius: s.radius, border, showLogo: s.showLogo, boysTile, girlsTile }} />
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
