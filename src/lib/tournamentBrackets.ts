// A tournament's brackets from its bouts, weight by weight (src/lib/boutBracket.ts) — the live bracket page and the
// Aesthetic tool's bracket preview (Kyle 2026-11-21) read the same. Names from the wrestler's profile; the bout's
// imported text never reaches a page.
import type { SupabaseClient } from '@supabase/supabase-js'
import { personLabel } from '@/lib/personName'
import { buildWeightBracket, resultText, type BracketBout, type WeightBracket } from '@/lib/boutBracket'

export type TournamentBrackets = { tournament: { id: string; name: string; start_date: string | null; season: string | null }; weights: number[]; brackets: Record<number, WeightBracket>; mixed: boolean }

export async function loadTournamentBrackets(supabase: SupabaseClient, id: string): Promise<TournamentBrackets | null> {
  const [{ data: boysTourn }, { data: girlsTourn }] = await Promise.all([
    supabase.from('in_season_tournaments').select('id, name, start_date, season').eq('id', id).maybeSingle(),
    supabase.from('in_season_tournaments_girls').select('id, name, start_date, season').eq('id', id).maybeSingle(),
  ])
  const tournament = boysTourn ?? girlsTourn
  if (!tournament) return null
  const boutTable = boysTourn ? 'tournament_bouts' : 'tournament_bouts_girls'

  type Row = {
    id: string; weight_class: string | number; round: string; winner: number | null
    result_type: string | null; fall_time_seconds: number | null; winner_score: number | null; loser_score: number | null
    wrestler1_id: string | null; wrestler1_name_raw: string | null; wrestler2_id: string | null; wrestler2_name_raw: string | null // raw-ok: the row's type; the text only reaches personLabel
    w1: { first_name: string; last_name: string } | null; w2: { first_name: string; last_name: string } | null
    s1: { id: number; display_name: string; is_nj: boolean | null } | null; s2: { id: number; display_name: string; is_nj: boolean | null } | null
  }
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from(boutTable)
      .select('id, weight_class, round, winner, result_type, fall_time_seconds, winner_score, loser_score, wrestler1_id, wrestler1_name_raw, wrestler2_id, wrestler2_name_raw, w1:wrestlers!wrestler1_id(first_name, last_name), w2:wrestlers!wrestler2_id(first_name, last_name), s1:schools!wrestler1_school_id(id, display_name, is_nj), s2:schools!wrestler2_school_id(id, display_name, is_nj)')
      .eq('in_season_tournament_id', id).order('id').range(from, from + 999)
    rows.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < 1000) break
  }

  // seeds (in_season_tournament_seeds[_girls]): weight + wrestler → seed (Kyle 2026-11-21: "can we also seed them?")
  const seedOf = new Map<string, number>()
  const { data: seeds } = await supabase.from(boysTourn ? 'in_season_tournament_seeds' : 'in_season_tournament_seeds_girls').select('weight_class, seed, wrestler_id').eq('in_season_tournament_id', id).limit(5000)
  for (const x of seeds ?? []) if (x.wrestler_id && x.seed) seedOf.set(`${x.weight_class}|${x.wrestler_id}`, x.seed)
  // names from the wrestler's profile; the bout's imported text never reaches the page
  const person = (wid: string | null, label: string, s: Row['s1'], wt: number) =>
    !wid && !label ? null : { id: wid, name: label || 'Unknown', school: s?.display_name ?? null, schoolId: s?.id ?? null, nj: s?.is_nj === true, seed: wid ? seedOf.get(`${wt}|${wid}`) ?? null : null }
  const byWeight = new Map<number, BracketBout[]>()
  for (const r of rows) {
    const wt = parseInt(String(r.weight_class), 10)
    if (!Number.isFinite(wt)) continue
    const b: BracketBout = {
      id: r.id, round: (r.round ?? '').trim(),
      top: person(r.wrestler1_id, personLabel(r.w1, r.wrestler1_name_raw), r.s1, wt),
      bottom: person(r.wrestler2_id, personLabel(r.w2, r.wrestler2_name_raw), r.s2, wt),
      winner: r.winner === 1 ? 'top' : r.winner === 2 ? 'bottom' : null,
      result: resultText(r.result_type, r.fall_time_seconds, r.winner_score, r.loser_score),
    }
    ;(byWeight.get(wt) ?? byWeight.set(wt, []).get(wt)!).push(b)
  }
  const weights = [...byWeight.keys()].sort((a, b) => a - b)
  const brackets: Record<number, WeightBracket> = {}
  for (const w of weights) brackets[w] = buildWeightBracket(byWeight.get(w)!)

  // an NJSIAA wrestler is marked only where out-of-state wrestlers are in the brackets too
  const mixed = rows.some(r => r.s1?.is_nj || r.s2?.is_nj) && rows.some(r => (r.s1 && !r.s1.is_nj) || (r.s2 && !r.s2.is_nj))
  return { tournament, weights, brackets, mixed }
}
