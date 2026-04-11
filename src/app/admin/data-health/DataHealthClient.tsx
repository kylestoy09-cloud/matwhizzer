'use client'

import { useState, useCallback, useEffect } from 'react'
import type { CheckResult, DataHealthResponse } from '@/app/api/admin/data-health/route'

// ── Types ─────────────────────────────────────────────────────────────────────

type SiteCheck = {
  label: string
  url: string
  status: number | null
  responseTime: number | null
  error: string | null
  done: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROD = 'https://matwhizzer.com'

const BASE_ROUTES = [
  { label: '/api/health',  url: `${PROD}/api/health` },
  { label: '/',            url: `${PROD}/` },
  { label: '/schools',     url: `${PROD}/schools` },
  { label: '/tournaments', url: `${PROD}/tournaments` },
  { label: '/wrestlers',   url: `${PROD}/wrestlers` },
]

const SECTIONS: { key: CheckResult['section']; label: string }[] = [
  { key: 'schools',     label: 'Schools' },
  { key: 'wrestlers',   label: 'wrestlers' },
  { key: 'entries',     label: 'Tournament Entries' },
  { key: 'standings',   label: 'Standings' },
  { key: 'leaderboards', label: 'Leaderboards' },
]

function statusFor(count: number): 'green' | 'yellow' | 'red' {
  if (count === 0) return 'green'
  if (count <= 10) return 'yellow'
  return 'red'
}

const CARD: Record<'green' | 'yellow' | 'red', string> = {
  green:  'bg-green-50 border-green-300',
  yellow: 'bg-yellow-50 border-yellow-300',
  red:    'bg-red-50 border-red-300',
}
const DOT: Record<'green' | 'yellow' | 'red', string> = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
}
const TEXT: Record<'green' | 'yellow' | 'red', string> = {
  green:  'text-green-900',
  yellow: 'text-yellow-900',
  red:    'text-red-900',
}

async function pingUrl(url: string): Promise<Omit<SiteCheck, 'label' | 'url'>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  const start = performance.now()
  try {
    const res = await fetch(url, { signal: controller.signal })
    const responseTime = Math.round(performance.now() - start)
    let error: string | null = null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error = text.slice(0, 200) || `HTTP ${res.status}`
    }
    return { status: res.status, responseTime, error, done: true }
  } catch (e) {
    const responseTime = Math.round(performance.now() - start)
    const msg = e instanceof Error ? e.message : String(e)
    return { status: null, responseTime, error: msg, done: true }
  } finally {
    clearTimeout(timer)
  }
}

// ── Components ────────────────────────────────────────────────────────────────

function SiteCard({ check }: { check: SiteCheck }) {
  const ok = check.status === 200
  const color = !check.done ? 'bg-slate-50 border-slate-200'
    : ok ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'

  return (
    <div className={`border rounded-none p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {!check.done ? (
          <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse flex-shrink-0" />
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
        )}
        <span className="text-xs font-mono font-semibold truncate text-slate-800">{check.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {!check.done ? (
          <span className="text-slate-400">checking…</span>
        ) : (
          <>
            <span className={`font-bold tabular-nums ${ok ? 'text-green-800' : 'text-red-700'}`}>
              {check.status ?? 'ERR'}
            </span>
            {check.responseTime != null && (
              <span className="text-slate-500">{check.responseTime}ms</span>
            )}
          </>
        )}
      </div>
      {check.error && (
        <p className="text-xs text-red-700 font-mono mt-1 break-all leading-tight">
          {check.error.slice(0, 120)}
        </p>
      )}
    </div>
  )
}

function CheckCard({ check }: { check: CheckResult }) {
  const [expanded, setExpanded] = useState(false)
  const s = statusFor(check.count)

  return (
    <div className={`border rounded-none p-4 ${CARD[s]}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${DOT[s]}`} />
          <span className={`text-xs font-semibold leading-snug ${TEXT[s]}`}>{check.name}</span>
        </div>
        <span className={`text-xl font-bold tabular-nums flex-shrink-0 ${TEXT[s]}`}>{check.count}</span>
      </div>

      {check.error && (
        <p className="text-xs text-red-600 mb-2">Query error: {check.error}</p>
      )}

      {check.count > 0 && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className={`text-xs underline opacity-60 hover:opacity-100 ${TEXT[s]}`}
          >
            {expanded ? 'Hide' : `Show ${Math.min(check.samples.length, 5)} samples`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {check.samples.map((row, i) => (
                <div key={i} className="text-xs font-mono opacity-75 break-all leading-tight">
                  {Object.entries(row)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('  •  ')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs opacity-40 mt-3">
        {new Date(check.checkedAt).toLocaleTimeString()}
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DataHealthClient() {
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [siteChecks, setSiteChecks] = useState<SiteCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const runSiteChecks = useCallback((schoolIds: number[]) => {
    const routes = [
      ...BASE_ROUTES,
      ...schoolIds.map(id => ({ label: `/schools/${id}`, url: `${PROD}/schools/${id}` })),
    ]

    // Set all to loading
    setSiteChecks(routes.map(r => ({ ...r, status: null, responseTime: null, error: null, done: false })))

    // Ping each in parallel, update individually as they resolve
    routes.forEach(async (route, i) => {
      const result = await pingUrl(route.url)
      setSiteChecks(prev => {
        const next = [...prev]
        next[i] = { ...next[i], ...result }
        return next
      })
    })
  }, [])

  const runAllChecks = useCallback(async () => {
    setLoading(true)
    setApiError(null)

    try {
      const res = await fetch('/api/admin/data-health')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `API ${res.status}`)
      }
      const data: DataHealthResponse = await res.json()
      setChecks(data.checks)
      setLastRun(new Date().toLocaleTimeString())
      runSiteChecks(data.sampleSchoolIds ?? [])
    } catch (e) {
      setApiError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [runSiteChecks])

  // Auto-run on mount
  useEffect(() => { runAllChecks() }, [runAllChecks])

  const checksBySection = Object.fromEntries(
    SECTIONS.map(s => [s.key, checks.filter(c => c.section === s.key)])
  )

  // Summary counts
  const totalIssues = checks.reduce((sum, c) => sum + c.count, 0)
  const redCount = checks.filter(c => statusFor(c.count) === 'red').length
  const yellowCount = checks.filter(c => statusFor(c.count) === 'yellow').length

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <button
          onClick={runAllChecks}
          disabled={loading}
          className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Running…' : 'Run All Checks'}
        </button>

        {lastRun && !loading && (
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Last run: {lastRun}</span>
            {checks.length > 0 && (
              <>
                <span>
                  <span className="font-semibold text-slate-700">{totalIssues}</span> total issues
                </span>
                {redCount > 0 && (
                  <span className="text-red-600 font-semibold">{redCount} critical</span>
                )}
                {yellowCount > 0 && (
                  <span className="text-yellow-700 font-semibold">{yellowCount} warnings</span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-300 text-red-800 text-sm px-4 py-3 mb-6 rounded-none">
          {apiError}
        </div>
      )}

      {/* ── Site Health ──────────────────────────────────────────────────────── */}
      {(siteChecks.length > 0 || loading) && (
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Site Health
          </h2>
          {siteChecks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {siteChecks.map(c => <SiteCard key={c.url} check={c} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border border-slate-200 bg-slate-50 rounded-none p-3 h-14 animate-pulse" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Data Health by section ───────────────────────────────────────────── */}
      {checks.length > 0 && SECTIONS.map(({ key, label }) => {
        const sectionChecks = checksBySection[key]
        if (!sectionChecks?.length) return null
        return (
          <section key={key} className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              {label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sectionChecks.map(c => <CheckCard key={c.id} check={c} />)}
            </div>
          </section>
        )
      })}

      {/* ── Skeleton while loading ───────────────────────────────────────────── */}
      {loading && checks.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="border border-slate-200 bg-slate-50 rounded-none p-4 h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && checks.length === 0 && !apiError && (
        <p className="text-center text-slate-400 text-sm py-16">
          Click "Run All Checks" to begin
        </p>
      )}
    </div>
  )
}
