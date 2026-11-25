// Speed bands (Kyle 2026-11-19, test only): a pin or tech ranked by how fast it is among its own kind, so a top-5% tech
// (under ~1:30) sits level with a top-5% pin (under ~0:25) instead of below a 1:00 pin as on the clock scale. The 12
// bonus ranks keep their shape — odd = pin, even = tech, each pair one band:
//   1/2 fastest 5% · 3/4 5–10% · 5/6 10–25% · 7/8 25–50% · 9/10 50–75% · 11/12 slowest 25%
// Cutoffs come from a season's own timed bouts (estimated times left out), boys and girls separately.
export const BAND_PCTS = [5, 10, 25, 50, 75] as const
export const BAND_NAMES = ['Fastest 5%', '5–10%', '10–25%', '25–50%', '50–75%', 'Slowest 25%']

/** Seconds at the 5th, 10th, 25th, 50th and 75th percentile, for pins and for techs */
export type BandCutoffs = { pin: number[]; tech: number[]; n: { pin: number; tech: number } }

export function bandCutoffs(times: { kind: 'pin' | 'tech'; secs: number }[]): BandCutoffs {
  const cut = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b)
    return BAND_PCTS.map(p => (s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p / 100))] : 0))
  }
  const pins = times.filter(t => t.kind === 'pin').map(t => t.secs)
  const techs = times.filter(t => t.kind === 'tech').map(t => t.secs)
  return { pin: cut(pins), tech: cut(techs), n: { pin: pins.length, tech: techs.length } }
}

/** A pin or tech's rank (1–12) on the speed scale */
export function speedRank(kind: 'pin' | 'tech', secs: number, c: BandCutoffs): number {
  const cuts = kind === 'pin' ? c.pin : c.tech
  let band = cuts.findIndex(x => secs <= x)
  if (band < 0) band = 5
  return 2 * band + (kind === 'pin' ? 1 : 2)
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/** "Pin under 0:25", "Tech 1:30–1:51", "Pin after 3:06" */
export function speedLabel(rank: number, c: BandCutoffs): string {
  const kind = rank % 2 ? 'pin' : 'tech'
  const band = Math.floor((rank - 1) / 2)
  const cuts = kind === 'pin' ? c.pin : c.tech
  const name = kind === 'pin' ? 'Pin' : 'Tech'
  if (band === 0) return `${name} under ${mmss(cuts[0])}`
  if (band === 5) return `${name} after ${mmss(cuts[4])}`
  return `${name} ${mmss(cuts[band - 1])}–${mmss(cuts[band])}`
}
