// The tournaments getting the history treatment (Kyle 2026-11-20): every past year's brackets back to 2012-13 (bouts),
// placements only before that. key = the source inventory's key (src/lib/tournamentHistorySources.ts); names = how
// each tournament is named in in_season_tournaments / _girls. Boys and girls each have their own list.
export type HistorySeries = { key: string; label: string; names: string[] }

export const HISTORY_SERIES: Record<'M' | 'F', HistorySeries[]> = {
  M: [
    { key: 'ironman', label: 'Iron Man', names: ['Iron Man Tournament'] },
    { key: 'beast', label: 'Beast of the East', names: ['Beast of the East'] },
    { key: 'powerade', label: 'Powerade', names: ['Powerade'] },
    { key: 'escape', label: 'Escape the Rock', names: ['Escape the Rock'] },
    { key: 'eccc', label: 'East Coast Catholic Classic', names: ['East Coast Catholic Classic'] },
    { key: 'samcali', label: 'Sam Cali Battle for the Belt', names: ['Sam Cali Battle for The Belt'] },
    { key: 'leff', label: 'Robin Leff', names: ['Robin Leff Tournament'] },
    { key: 'morris', label: 'Morris County', names: ['Morris County Tournament'] },
    { key: 'burlington', label: 'Burlington County', names: ['Burlington County Tournament'] },
    { key: 'essex', label: 'Essex County', names: ['Essex County Tournament'] },
    { key: 'somerset', label: 'Somerset County', names: ['SCIAA Somerset County Tournament'] },
    { key: 'shore', label: 'Shore Conference', names: ['Shore Conference Tournament'] },
    { key: 'hws', label: 'Hunterdon/Warren/Sussex', names: ['Hunterdon/Warren/Sussex Tournament'] },
    { key: 'cvc', label: 'CVC', names: ['CVC Tournament'] },
  ],
  F: [
    { key: 'ironman', label: 'Women of Ironman', names: ['Women of Ironman'] },
    { key: 'beast', label: 'Beast of the East', names: ['Beast of the East'] },
    { key: 'escape', label: 'Escape the Rock', names: ['Escape the Rock'] },
    { key: 'samcali', label: 'Sam Cali Invitational', names: ['Sam Cali Invitational'] },
    { key: 'essex', label: 'Essex County', names: ['Essex County Tournament'] },
    { key: 'shore', label: 'Shore Conference', names: ['Shore Conference Tournament'] },
    { key: 'hws', label: 'Hunterdon/Warren/Sussex', names: ['Hunterdon/Warren/Sussex Tournament'] },
    { key: 'cvc', label: 'CVC', names: ['CVC Tournament'] },
    { key: 'colonial', label: 'Colonial Conference', names: ['Colonial Conference Tournament'] },
  ],
}

/** Bouts are gathered from this season on; before it, placements only (Kyle 2026-11-20) */
export const BOUTS_FROM = '2012-13' // season-literal-ok: Kyle's cutoff for gathering bouts
