'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type SchoolInfo = {
  id: number
  abbreviation: string
  school_name: string
}

type BreakdownRow = {
  tournament_type: string
  total_points: number
  win_count: number
}

type WrestlerRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  districts_placement: string | null
  regions_placement: string | null
  state_placement: string | null
}

type FollowedWrestlerRow = {
  id: string
  first_name: string
  last_name: string
  gender: string
}

type WrestlerPlacement = {
  wrestler_id: string
  wrestler_name: string
  weight: number
  place: number
  tournament_type: string
}

const TOURNEY_LABEL: Record<string, string> = {
  districts: 'Districts',
  regions: 'Regions',
  boys_state: 'State',
  girls_regions: 'Regions',
  girls_state: 'State',
}

function placeBadge(p: string | null) {
  if (!p) return null
  const cls = p === '1st' ? 'bg-amber-100 text-amber-800'
    : p === '2nd' ? 'bg-slate-200 text-slate-700'
    : p === '3rd' ? 'bg-orange-100 text-orange-800'
    : 'bg-emerald-50 text-emerald-700'
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>{p}</span>
}

export function PersonalizedHome() {
  const [primarySchool, setPrimarySchool] = useState<SchoolInfo | null>(null)
  const [followedSchools, setFollowedSchools] = useState<SchoolInfo[]>([])
  const [preference, setPreference] = useState<string>('both')
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([])
  const [wrestlers, setWrestlers] = useState<WrestlerRow[]>([])
  const [followedWrestlers, setFollowedWrestlers] = useState<FollowedWrestlerRow[]>([])
  const [wrestlerPlacements, setWrestlerPlacements] = useState<Map<string, WrestlerPlacement[]>>(new Map())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoaded(true); return }

      const { data: profile } = await supabase
        .from('users')
        .select('primary_school_id, followed_school_ids, followed_wrestler_ids, wrestling_preference')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) { setLoaded(true); return }
      const p = profile as {
        primary_school_id: number | null
        followed_school_ids: number[] | null
        followed_wrestler_ids: string[] | null
        wrestling_preference: string | null
      }

      setPreference(p.wrestling_preference ?? 'both')

      // Fetch school info
      const allSchoolIds = [
        ...(p.primary_school_id ? [p.primary_school_id] : []),
        ...(p.followed_school_ids ?? []),
      ]
      if (allSchoolIds.length > 0) {
        const { data: schools } = await supabase
          .from('school_names')
          .select('id, abbreviation, school_name')
          .in('id', allSchoolIds)
        const schoolMap = new Map((schools as SchoolInfo[] ?? []).map(s => [s.id, s]))

        if (p.primary_school_id && schoolMap.has(p.primary_school_id)) {
          const primary = schoolMap.get(p.primary_school_id)!
          setPrimarySchool(primary)

          // Fetch school data for primary school
          const gender = p.wrestling_preference === 'girls' ? 'F' : 'M'
          const [bdRes, wrRes] = await Promise.all([
            supabase.rpc('school_points_breakdown', { p_school: primary.abbreviation, p_gender: gender, p_season: 2 }),
            supabase.rpc('school_wrestlers', { p_school: primary.abbreviation, p_gender: gender, p_season: 2 }),
          ])
          setBreakdown((bdRes.data ?? []) as BreakdownRow[])
          const wr = (wrRes.data ?? []) as WrestlerRow[]
          // Sort: state placers first, then region, then district, by weight
          wr.sort((a, b) => {
            const aRank = a.state_placement ? 0 : a.regions_placement ? 1 : a.districts_placement ? 2 : 3
            const bRank = b.state_placement ? 0 : b.regions_placement ? 1 : b.districts_placement ? 2 : 3
            if (aRank !== bRank) return aRank - bRank
            return a.primary_weight - b.primary_weight
          })
          setWrestlers(wr.slice(0, 14))
        }

        const followed = (p.followed_school_ids ?? [])
          .filter(id => id !== p.primary_school_id && schoolMap.has(id))
          .map(id => schoolMap.get(id)!)
        setFollowedSchools(followed)
      }

      // Fetch followed wrestlers
      const wrestlerIds = p.followed_wrestler_ids ?? []
      if (wrestlerIds.length > 0) {
        const { data: wData } = await supabase
          .from('wrestlers')
          .select('id, first_name, last_name, gender')
          .in('id', wrestlerIds)
        const fw = (wData ?? []) as FollowedWrestlerRow[]
        setFollowedWrestlers(fw)

        // Fetch placements for followed wrestlers
        const { data: plData } = await supabase
          .from('placements')
          .select('wrestler_id, weight_class:weight_classes(weight), place, tournament:tournaments(tournament_type)')
          .in('wrestler_id', wrestlerIds)
          .lte('place', 8)
        if (plData) {
          const map = new Map<string, WrestlerPlacement[]>()
          for (const row of plData as unknown as { wrestler_id: string; weight_class: { weight: number } | null; place: number; tournament: { tournament_type: string } | null }[]) {
            if (!row.tournament || !row.weight_class) continue
            const list = map.get(row.wrestler_id) ?? []
            list.push({
              wrestler_id: row.wrestler_id,
              wrestler_name: '',
              weight: row.weight_class.weight,
              place: row.place,
              tournament_type: row.tournament.tournament_type,
            })
            map.set(row.wrestler_id, list)
          }
          setWrestlerPlacements(map)
        }
      }

      setLoaded(true)
    })
  }, [])

  if (!loaded) return null
  if (!primarySchool && followedSchools.length === 0 && followedWrestlers.length === 0) return null

  const base = preference === 'girls' ? '/girls' : '/boys'
  const totalPts = breakdown.reduce((sum, r) => sum + Number(r.total_points), 0)
  const totalWins = breakdown.reduce((sum, r) => sum + Number(r.win_count), 0)

  return (
    <div className="mb-8 space-y-6">
      {/* ── Primary School Section ── */}
      {primarySchool && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <Link
                href={`${base}/schools/${encodeURIComponent(primarySchool.abbreviation)}`}
                className="text-lg font-bold text-slate-900 hover:underline"
              >
                {primarySchool.school_name}
              </Link>
              <p className="text-xs text-slate-500 mt-0.5">Your primary school</p>
            </div>
            {totalPts > 0 && (
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900 tabular-nums">{Math.round(totalPts * 10) / 10}</p>
                <p className="text-[10px] text-slate-500 uppercase">Team Pts</p>
              </div>
            )}
          </div>

          {/* Points breakdown */}
          {breakdown.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-50 flex gap-4">
              {breakdown.map(r => (
                <div key={r.tournament_type} className="text-center">
                  <p className="text-sm font-semibold text-slate-800 tabular-nums">{r.total_points}</p>
                  <p className="text-[10px] text-slate-400">{TOURNEY_LABEL[r.tournament_type] ?? r.tournament_type}</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500 tabular-nums">{totalWins}</p>
                <p className="text-[10px] text-slate-400">Wins</p>
              </div>
            </div>
          )}

          {/* Top wrestlers */}
          {wrestlers.length > 0 && (
            <div className="divide-y divide-slate-50">
              {wrestlers.map(w => (
                <div key={w.wrestler_id} className="flex items-center gap-2 px-5 py-2">
                  <span className="text-[10px] text-slate-400 w-8 shrink-0 text-right tabular-nums">{w.primary_weight}</span>
                  <Link
                    href={`/wrestler/${w.wrestler_id}`}
                    className="text-sm font-medium text-slate-800 hover:underline truncate flex-1"
                  >
                    {w.wrestler_name}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    {placeBadge(w.state_placement)}
                    {!w.state_placement && placeBadge(w.regions_placement)}
                    {!w.state_placement && !w.regions_placement && placeBadge(w.districts_placement)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <Link
              href={`${base}/schools/${encodeURIComponent(primarySchool.abbreviation)}`}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View full school profile →
            </Link>
          </div>
        </section>
      )}

      {/* ── Followed Schools ── */}
      {followedSchools.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Following</h2>
          <div className="flex flex-wrap gap-2">
            {followedSchools.map(s => (
              <Link
                key={s.id}
                href={`${base}/schools/${encodeURIComponent(s.abbreviation)}`}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 shadow-sm transition-colors"
              >
                {s.school_name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Followed Wrestlers ── */}
      {followedWrestlers.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Wrestlers</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {followedWrestlers.map(w => {
              const pls = wrestlerPlacements.get(w.id) ?? []
              // Show best placement per tournament type
              const best = new Map<string, WrestlerPlacement>()
              for (const pl of pls) {
                const existing = best.get(pl.tournament_type)
                if (!existing || pl.place < existing.place) best.set(pl.tournament_type, pl)
              }
              const sortedPlacements = [...best.values()].sort((a, b) => {
                const order: Record<string, number> = { boys_state: 0, girls_state: 0, regions: 1, girls_regions: 1, districts: 2 }
                return (order[a.tournament_type] ?? 3) - (order[b.tournament_type] ?? 3)
              })
              const SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }

              return (
                <div key={w.id} className="flex items-center gap-2 px-5 py-2.5">
                  <Link
                    href={`/wrestler/${w.id}`}
                    className="text-sm font-medium text-slate-800 hover:underline truncate flex-1"
                  >
                    {w.first_name} {w.last_name}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {sortedPlacements.map(pl => (
                      <span
                        key={pl.tournament_type}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          pl.place === 1 ? 'bg-amber-100 text-amber-800'
                          : pl.place <= 3 ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {TOURNEY_LABEL[pl.tournament_type] ?? pl.tournament_type} {pl.place}{SUFFIX[pl.place] ?? 'th'}
                      </span>
                    ))}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {w.gender === 'F' ? 'G' : 'B'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
