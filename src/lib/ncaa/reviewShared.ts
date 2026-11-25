// The college review card's data and its Google link: safe for the browser (src/lib/ncaa/review.ts has the reads and writes)
export type ReviewCandidate = { wrestler_id: string; name: string; schools: string; hs: string; gap: string; why: string }
export type ReviewRow = {
  id: number; level: string; year: number; weight: number; name: string; college_raw: string
  college: { name: string; primary_color: string | null; secondary_color: string | null } | null
  seed: number | null; place: number | null; note: string | null; candidates: ReviewCandidate[]
  // one card per wrestler at a college (Kyle 2026-11-17: "make one Joseph Langel Rutgers … not one per season"):
  // every NCAA year of the same name at the same college, oldest first; id / year / weight above are the newest
  years: { id: number; year: number; level: string; weight: number; seed: number | null; place: number | null }[]
}

/** Google: the wrestler's name (no quotes — Kyle: they made the results worse), his college, wrestling, and the NCAA year (Kyle 2026-11-17) */
export const reviewGoogleUrl = (r: Pick<ReviewRow, 'name' | 'college' | 'college_raw' | 'year'>) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${r.name} ${r.college?.name ?? r.college_raw} wrestling ${r.year} NCAA`)}`
