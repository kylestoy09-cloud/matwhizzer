export type TournamentRecord = {
  id: string
  name: string
  start_date: string | null
}

export type TournamentMatchResult = {
  tournament_id: string
  tournament_name: string
  start_date: string | null
  confidence: 'exact' | 'high' | 'low' | 'none'
  score: number
}

// Strip generic words that don't distinguish tournaments from each other.
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'annual', 'tournament', 'invitational', 'classic', 'cup',
  'open', 'championship', 'championships', 'invit', 'invite', 'duals', 'dual',
  'tri', 'quad', 'jamboree', 'jam', 'meet', 'wrestling', 'league',
])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t))
    .join(' ')
    .trim()
}

function scoreNames(parsed: string, existing: string): number {
  const p = normalize(parsed)
  const e = normalize(existing)
  if (!p || !e) return 0

  // Exact normalized match
  if (p === e) return 100

  // One contains the other
  if (p.includes(e) || e.includes(p)) return 88

  // Token Jaccard similarity
  const pToks = new Set(p.split(' ').filter(t => t.length >= 3))
  const eToks = new Set(e.split(' ').filter(t => t.length >= 3))
  if (!pToks.size || !eToks.size) return 0

  let inter = 0
  for (const t of pToks) if (eToks.has(t)) inter++
  const union = new Set([...pToks, ...eToks]).size
  const jaccard = inter / union

  // Boost if the first significant token matches (usually the hosting school name)
  const pFirst = [...pToks][0]
  const eFirst = [...eToks][0]
  const firstBoost = pFirst && eFirst && pFirst === eFirst ? 10 : 0

  return Math.min(87, Math.round(jaccard * 80) + firstBoost)
}

function toConfidence(score: number): TournamentMatchResult['confidence'] {
  if (score >= 95) return 'exact'
  if (score >= 70) return 'high'
  if (score >= 40) return 'low'
  return 'none'
}

export function matchTournament(
  parsedName: string,
  candidates: TournamentRecord[],
): { best: TournamentMatchResult | null; alternates: TournamentMatchResult[] } {
  const scored = candidates
    .map(c => {
      const s = scoreNames(parsedName, c.name)
      return {
        tournament_id:   c.id,
        tournament_name: c.name,
        start_date:      c.start_date,
        score:           s,
        confidence:      toConfidence(s),
      } satisfies TournamentMatchResult
    })
    .filter(c => c.score >= 30)
    .sort((a, b) => b.score - a.score)

  const best = scored[0] ?? null
  const alternates = scored.slice(1, 5)
  return { best, alternates }
}
