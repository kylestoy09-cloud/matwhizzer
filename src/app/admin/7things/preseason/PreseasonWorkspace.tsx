'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

// ── Article registry ──────────────────────────────────────────────────────────

const PRESEASON_ARTICLES = [
  { key: 'intro',                        label: 'Intro',                             hasSections: false },
  { key: 'review_underclassmen',         label: "Review Last Season's Underclassmen", hasSections: false },
  { key: 'anticipated_dates',            label: 'Most Anticipated Dates',             hasSections: false },
  { key: 'active_offseasons',            label: 'Most Active Off-seasons',            hasSections: true  },
  { key: 'top_teams',                    label: 'Top Teams',                          hasSections: true  },
  { key: 'returning_sophomores',         label: '7 Returning Sophomores',             hasSections: true  },
  { key: 'returning_juniors',            label: '7 Returning Juniors',                hasSections: true  },
  { key: 'returning_seniors',            label: '7 Returning Seniors',                hasSections: true  },
  { key: 'p4p',                          label: 'P4P',                                hasSections: true  },
  { key: 'best_conferences',             label: 'Best Conferences',                   hasSections: false },
  { key: 'best_public_sectional_groups', label: 'Best Public Sectional Groups',       hasSections: false },
  { key: 'best_nonpublic_weights',       label: 'Best Non-Public Weights',            hasSections: false },
  { key: 'best_districts',              label: 'Best Districts',                     hasSections: false },
  { key: 'best_regions',                label: 'Best Regions',                       hasSections: false },
  { key: 'best_mascots',                label: 'Best School Mascots',                hasSections: false },
  { key: 'best_counties',               label: 'Best Counties',                      hasSections: false },
] as const

type ArticleKey = typeof PRESEASON_ARTICLES[number]['key']

type SectionKey = 'state' | 'north_i' | 'north_ii' | 'central' | 'south'

const ALL_SECTIONS: SectionKey[]         = ['state', 'north_i', 'north_ii', 'central', 'south']
const SECTION_LABELS: Record<SectionKey, string> = {
  state:    'State',
  north_i:  'North I',
  north_ii: 'North II',
  central:  'Central',
  south:    'South',
}

// rowKey encodes article_key + section into a single map key
function rk(articleKey: string, section: SectionKey): string {
  return `${articleKey}::${section}`
}

// DB section column: 'state' → null, others pass through
function toDbSection(s: SectionKey): string | null {
  return s === 'state' ? null : s
}

// DB section column → SectionKey
function fromDbSection(s: string | null): SectionKey {
  return (s ?? 'state') as SectionKey
}

type DBRow = {
  id:          string
  article_key: string
  section:     string | null
  title:       string
  body:        string
  completed:   boolean
  status:      string
}

type LocalContent = { title: string; body: string }

// ── Component ─────────────────────────────────────────────────────────────────

export function PreseasonWorkspace() {
  const { gender } = useAdminGender()

  const [seasonId,    setSeasonId]    = useState<number | null>(null)
  const [seasonLabel, setSeasonLabel] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Persisted row IDs from DB (rowKey → id)
  const [rowIds,    setRowIds]    = useState<Map<string, string>>(new Map())
  // Completion status per article_key
  const [completed, setCompleted] = useState<Set<ArticleKey>>(new Set())
  // Local editable content per rowKey
  const [content,   setContent]   = useState<Map<string, LocalContent>>(new Map())
  // Which rowKeys have unsaved changes
  const [dirty,     setDirty]     = useState<Set<string>>(new Set())
  // Save indicator
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  // Selected article and section
  const [selKey,  setSelKey]  = useState<ArticleKey>('intro')
  const [selSec,  setSelSec]  = useState<SectionKey>('state')

  // Refs for use inside intervals/callbacks without stale closure issues
  const seasonIdRef = useRef<number | null>(null)
  const dirtyRef    = useRef<Set<string>>(new Set())
  const contentRef  = useRef<Map<string, LocalContent>>(new Map())
  const rowIdsRef   = useRef<Map<string, string>>(new Map())
  const genderRef   = useRef(gender)

  useEffect(() => { seasonIdRef.current = seasonId },    [seasonId])
  useEffect(() => { dirtyRef.current    = dirty },       [dirty])
  useEffect(() => { contentRef.current  = content },     [content])
  useEffect(() => { rowIdsRef.current   = rowIds },      [rowIds])
  useEffect(() => { genderRef.current   = gender },      [gender])

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async (g: string) => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/admin/7things/preseason?gender=${g}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }

      setSeasonId(data.seasonId)
      setSeasonLabel(data.seasonLabel)

      const ids  = new Map<string, string>()
      const cont = new Map<string, LocalContent>()
      const done = new Set<ArticleKey>()

      for (const row of (data.articles ?? []) as DBRow[]) {
        const sec  = fromDbSection(row.section)
        const key  = rk(row.article_key, sec)
        ids.set(key,  row.id)
        cont.set(key, { title: row.title, body: row.body })
        // Article is complete when the state-level row has completed=true
        if (row.completed && row.section === null) done.add(row.article_key as ArticleKey)
      }

      setRowIds(ids); setContent(cont); setCompleted(done); setDirty(new Set())

      const first = PRESEASON_ARTICLES.find(a => !done.has(a.key))
      if (first) { setSelKey(first.key); setSelSec('state') }
    } catch { setError('Failed to load') }
    finally   { setLoading(false) }
  }, [])

  useEffect(() => { load(gender) }, [gender, load])

  // ── Save helpers ───────────────────────────────────────────────────────────

  const saveRowKey = useCallback(async (rowKey: string): Promise<void> => {
    const sid = seasonIdRef.current
    if (!sid) return
    const [articleKey, section] = rowKey.split('::') as [string, SectionKey]
    const local = contentRef.current.get(rowKey) ?? { title: '', body: '' }
    const id    = rowIdsRef.current.get(rowKey)

    const payload: Record<string, unknown> = {
      season_id:   sid,
      gender:      genderRef.current,
      article_key: articleKey,
      section:     toDbSection(section),
      title:       local.title,
      body:        local.body,
    }
    if (id) payload.id = id

    try {
      const res  = await fetch('/api/admin/7things/preseason', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.error && data.id && !id) {
        setRowIds(prev => new Map(prev).set(rowKey, data.id))
      }
    } catch { /* silent */ }
  }, [])

  const saveAllDirty = useCallback(async (): Promise<void> => {
    const keys = [...dirtyRef.current]
    if (!keys.length) return
    setSaveState('saving')
    await Promise.all(keys.map(saveRowKey))
    setDirty(prev => { const n = new Set(prev); keys.forEach(k => n.delete(k)); return n })
    setSaveState('saved')
  }, [saveRowKey])

  // Auto-save every 30s
  useEffect(() => {
    const id = setInterval(() => { if (dirtyRef.current.size > 0) saveAllDirty() }, 30_000)
    return () => clearInterval(id)
  }, [saveAllDirty])

  // ── Content editing ────────────────────────────────────────────────────────

  function updateField(field: 'title' | 'body', value: string) {
    const key = rk(selKey, selSec)
    setContent(prev => { const n = new Map(prev); n.set(key, { ...(n.get(key) ?? { title: '', body: '' }), [field]: value }); return n })
    setDirty(prev => new Set(prev).add(key))
    setSaveState('unsaved')
  }

  async function switchTo(newKey: ArticleKey, newSec: SectionKey) {
    await saveAllDirty()
    setSelKey(newKey); setSelSec(newSec)
  }

  async function handleArticleChange(key: ArticleKey) {
    const meta = PRESEASON_ARTICLES.find(a => a.key === key)!
    await switchTo(key, 'state')
    if (!meta.hasSections) setSelSec('state')
  }

  // ── Mark complete / unmark ─────────────────────────────────────────────────

  async function toggleComplete() {
    const sid = seasonIdRef.current; if (!sid) return
    await saveAllDirty()
    const nowComplete = !completed.has(selKey)
    const stateKey    = rk(selKey, 'state')
    const id          = rowIdsRef.current.get(stateKey)
    const local       = contentRef.current.get(stateKey) ?? { title: '', body: '' }

    const payload: Record<string, unknown> = {
      season_id: sid, gender: genderRef.current,
      article_key: selKey, section: null,
      title: local.title, body: local.body,
      completed: nowComplete,
    }
    if (id) payload.id = id

    const res  = await fetch('/api/admin/7things/preseason', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.error) {
      setCompleted(prev => {
        const n = new Set(prev)
        if (nowComplete) n.add(selKey); else n.delete(selKey)
        return n
      })
      if (!id && data.id) setRowIds(prev => new Map(prev).set(stateKey, data.id))
    }
  }

  // ── Finalize ───────────────────────────────────────────────────────────────

  async function finalize() {
    const sid = seasonIdRef.current; if (!sid) return
    await saveAllDirty()
    // Set status = finalized on ALL rows for this article
    const meta = PRESEASON_ARTICLES.find(a => a.key === selKey)!
    const sections: SectionKey[] = meta.hasSections ? ALL_SECTIONS : ['state']
    await Promise.all(sections.map(async sec => {
      const key = rk(selKey, sec)
      const id  = rowIdsRef.current.get(key)
      if (!id) return
      await fetch('/api/admin/7things/preseason', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, season_id: sid, gender: genderRef.current, article_key: selKey, section: toDbSection(sec), status: 'finalized' }),
      })
    }))
    // Refresh to pick up status changes
    await load(genderRef.current)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const selMeta        = PRESEASON_ARTICLES.find(a => a.key === selKey)!
  const curKey         = rk(selKey, selSec)
  const curContent     = content.get(curKey) ?? { title: '', body: '' }
  const isComplete     = completed.has(selKey)
  const completeCount  = completed.size
  const wordCount      = curContent.body.trim().split(/\s+/).filter(Boolean).length
  const visibleSecs    = selMeta.hasSections ? ALL_SECTIONS : ([] as SectionKey[])
  const stateRk        = rk(selKey, 'state')

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <p className="text-slate-500 text-sm">Loading workspace…</p>
    </div>
  )

  if (!seasonId) return (
    <div className="flex items-center justify-center h-screen bg-slate-50 flex-col gap-2">
      <p className="text-slate-700 font-semibold">No preseason configured</p>
      <p className="text-sm text-slate-500">Set a preseason stage in season_gender_state for {gender === 'M' ? 'Boys' : 'Girls'}.</p>
    </div>
  )

  return (
    <div className="flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">7 Things · Preseason</span>
          {seasonLabel && <span className="text-xs text-slate-400 hidden sm:inline">{seasonLabel}</span>}
          <span className="text-xs text-slate-500">{gender === 'M' ? 'Boys' : 'Girls'}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {completeCount}/{PRESEASON_ARTICLES.length} done
          </span>
          <span className={`text-xs font-medium ${
            saveState === 'saved'   ? 'text-green-400' :
            saveState === 'saving'  ? 'text-yellow-400' : 'text-slate-400'
          }`}>
            {saveState === 'saved' ? '● Saved' : saveState === 'saving' ? '● Saving…' : '● Unsaved'}
          </span>
          <button
            onClick={saveAllDirty}
            className="text-xs text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded px-2 py-0.5 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* ── Article selector bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0 flex-wrap">
        <select
          value={selKey}
          onChange={e => handleArticleChange(e.target.value as ArticleKey)}
          className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-0 max-w-sm"
        >
          {PRESEASON_ARTICLES.map(a => (
            <option key={a.key} value={a.key}>
              {completed.has(a.key) ? '✓  ' : '     '}{a.label}
            </option>
          ))}
        </select>
        <button
          onClick={toggleComplete}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
            isComplete
              ? 'bg-green-50 text-green-700 border-green-300 hover:bg-white hover:text-slate-700 hover:border-slate-300'
              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-800 hover:text-slate-900'
          }`}
        >
          {isComplete ? '✓ Complete' : 'Mark Complete'}
        </button>
        {error && <p className="text-xs text-red-600 w-full">{error}</p>}
      </div>

      {/* ── Section tabs (hasSections articles only) ─────────────────────── */}
      {visibleSecs.length > 0 && (
        <div className="flex gap-1 px-4 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
          {visibleSecs.map(sec => (
            <button
              key={sec}
              onClick={() => switchTo(selKey, sec)}
              className={`text-xs font-semibold px-3 py-1 rounded-md whitespace-nowrap transition-colors ${
                selSec === sec
                  ? 'bg-slate-900 text-white'
                  : `text-slate-500 hover:text-slate-900 hover:bg-slate-200 ${dirty.has(rk(selKey, sec)) ? 'underline decoration-dotted' : ''}`
              }`}
            >
              {SECTION_LABELS[sec]}
              {dirty.has(rk(selKey, sec)) && selSec !== sec && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Title input ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-2 shrink-0 border-b border-slate-100">
        <input
          type="text"
          value={curContent.title}
          onChange={e => updateField('title', e.target.value)}
          placeholder={selMeta.label + (selSec !== 'state' ? ` — ${SECTION_LABELS[selSec]}` : '')}
          className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none bg-transparent"
        />
      </div>

      {/* ── Body textarea ─────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-4 overflow-hidden">
        <textarea
          key={curKey}
          value={curContent.body}
          onChange={e => updateField('body', e.target.value)}
          placeholder={`Start writing…`}
          className="w-full h-full resize-none text-[15px] text-slate-800 leading-7 focus:outline-none placeholder:text-slate-300"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        />
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0">
        <span className="text-xs text-slate-400">{wordCount.toLocaleString()} words</span>
        <button
          onClick={finalize}
          className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
        >
          Finalize →
        </button>
      </div>

    </div>
  )
}
