import { load, rowsOf } from './build_podiums.mts'
for (const [k, f, show] of [['J', ['Journeymen Fall Classic.rtf', '2026JourneymenFallClassic.csv'], ['Girls|96', 'Main|113']], ['NJFS', ['2026 New Jersey Freestyle & Greco State Championship.rtf', '2026NewJerseyFreestyle&GrecoStateChampionship.csv'], ['14U Boys Freestyle|80', '16U Boys Freestyle|120']]] as const) {
  const rows = rowsOf(await load([...f]))
  for (const sh of show) console.log(k, sh, rows.filter(r => `${r.division}|${r.weight}` === sh).sort((a, z) => a.place - z.place).map(r => `${r.place}${r.place_to ? '-' + r.place_to : ''} ${r.name}`).join(', '))
}
