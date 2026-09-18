'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { AdminSeasonToggle } from '@/components/admin/AdminSeasonToggle'
import { SignOutButton } from './sign-out-button'

type Check = { key: string; label: string; done: boolean; detail: string }

type Summary = {
  seasonId: number
  yearLabel: string
  season: {
    duals:       { total: number; withResults: number; pct: number }
    tournaments: { total: number; withResults: number; pct: number }
    pct: number
  } | null
  preseason: {
    checks:   Check[]
    complete: number
    total:    number
    pct:      number
  }
  postseason: {
    complete: number
    total:    number
    pct:      number
    hasData:  boolean
  }
}

function Ring({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-slate-200 dark:text-slate-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        className={pct >= 80 ? 'text-green-500' : pct >= 40 ? 'text-blue-500' : 'text-slate-400'}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90 fill-current text-slate-800 dark:text-slate-100"
        style={{ fontSize: size * 0.22, fontWeight: 700, transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {pct}%
      </text>
    </svg>
  )
}

function DashCard({
  href, title, subtitle, pct, links, children,
}: {
  href: string
  title: string
  subtitle: string
  pct: number
  links: { label: string; href: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="border border-slate-200 bg-white flex flex-col">
      <div className="px-5 py-4 flex items-start gap-4 border-b border-slate-100">
        <Ring pct={pct} size={60} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <Link href={href} className="text-xs text-blue-600 hover:underline shrink-0">Open →</Link>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-2 text-xs text-slate-600 flex-1">
        {children}
      </div>
      {links.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-3 grid grid-cols-2 gap-1.5">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-center font-medium truncate">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, done }: { label: string; value: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done !== undefined && (
        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
          {done ? '✓' : '·'}
        </span>
      )}
      <span className="flex-1 text-slate-600">{label}</span>
      <span className="font-medium text-slate-800 tabular-nums">{value}</span>
    </div>
  )
}

export function AdminDashboardClient({ email }: { email: string }) {
  const { gender } = useAdminGender()
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = seasonId ? `seasonId=${seasonId}&gender=${gender}` : `gender=${gender}`
    fetch(`/api/admin/home-summary?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setSummary(d)
        if (!seasonId && d.seasonId) setSeasonId(d.seasonId)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [seasonId, gender])

  useEffect(() => { load() }, [load])

  // Re-fetch when gender changes
  useEffect(() => { setSeasonId(null) }, [gender])

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">{email}</p>
          <h1 className="text-2xl font-bold text-slate-900">{genderLabel} Season Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          {seasonId !== null && (
            <AdminSeasonToggle value={seasonId} onChange={id => { setSeasonId(id) }} gender={gender} />
          )}
          <SignOutButton />
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-6">{error}</div>
      )}

      {loading || !summary ? (
        <div className="text-sm text-slate-400 py-16 text-center">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Season label */}
          <p className="text-sm font-medium text-slate-600">{summary.yearLabel}</p>

          {/* Three dashboard cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Preseason */}
            <DashCard
              href="/admin/preseason"
              title="Preseason"
              subtitle="Setup checks before the season starts"
              pct={summary.preseason.pct}
              links={[
                { label: 'Groups & Alignment',    href: '/admin/groups' },
                { label: 'School Profiles',       href: '/admin/schools' },
                { label: 'Seasons & Roster',      href: '/admin/seasons' },
                { label: 'Bulk Schedule',         href: '/admin/schedule/bulk-import' },
                { label: 'Tournament Rollover',   href: '/admin/tournaments/rollover' },
                { label: 'Rankings Hub (Boys)',   href: '/admin/rankings-hub' },
                { label: 'Rankings Hub (Girls)',  href: '/admin/rankings-hub-girls' },
              ]}
            >
              {summary.preseason.checks.map(c => (
                <StatRow key={c.key} label={c.label} value={c.detail} done={c.done} />
              ))}
            </DashCard>

            {/* Season */}
            <DashCard
              href="/admin/season"
              title="Season"
              subtitle="Data imported vs. scheduled"
              pct={summary.season?.pct ?? 0}
              links={[
                { label: 'Tournament Hub',      href: '/admin/tournament-hub' },
                { label: 'Bout Audit',          href: '/admin/bout-audit' },
                { label: 'Dual Audit',          href: '/admin/dual-audit' },
                { label: 'PP Audit',            href: '/admin/pp-audit' },
                { label: 'Team Scores',         href: '/admin/team-scores' },
                { label: 'Hammer Scores',       href: '/admin/hammer-scores' },
              ]}
            >
              {summary.season ? (
                <>
                  <StatRow
                    label="Dual meets"
                    value={`${summary.season.duals.withResults} / ${summary.season.duals.total}`}
                    done={summary.season.duals.total > 0 && summary.season.duals.pct === 100}
                  />
                  <StatRow
                    label="Tournaments"
                    value={`${summary.season.tournaments.withResults} / ${summary.season.tournaments.total}`}
                    done={summary.season.tournaments.total > 0 && summary.season.tournaments.pct === 100}
                  />
                  <div className="pt-1 space-y-1">
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-slate-500">Duals</span>
                        <span className="text-slate-700 font-medium">{summary.season.duals.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${summary.season.duals.pct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-slate-500">Tournaments</span>
                        <span className="text-slate-700 font-medium">{summary.season.tournaments.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${summary.season.tournaments.pct}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-400">No season data found.</p>
              )}
            </DashCard>

            {/* Postseason */}
            <DashCard
              href="/admin/postseason"
              title="Postseason"
              subtitle={summary.postseason.hasData ? 'Manual checklist' : 'Checklist not yet initialized'}
              pct={summary.postseason.pct}
              links={[
                { label: 'Playoff Seeds',   href: '/admin/playoff-seeds' },
                { label: 'Import Hub',      href: '/admin/import-hub' },
                { label: 'Region Seeds',    href: '/admin/region-seeds' },
                { label: 'Bracket Editor',  href: '/admin/bracket' },
                { label: 'Team Scores',     href: '/admin/team-scores' },
                { label: 'PP Audit',        href: '/admin/pp-audit' },
              ]}
            >
              {summary.postseason.hasData ? (
                <StatRow
                  label="Steps complete"
                  value={`${summary.postseason.complete} / ${summary.postseason.total}`}
                  done={summary.postseason.complete === summary.postseason.total && summary.postseason.total > 0}
                />
              ) : (
                <p className="text-slate-400 text-xs">
                  The postseason checklist initializes when you finalize the current season.
                </p>
              )}
              <Link href="/admin/postseason" className="block text-blue-600 hover:underline text-xs pt-1">
                View checklist →
              </Link>
            </DashCard>
          </div>

        </div>
      )}
    </div>
  )
}
