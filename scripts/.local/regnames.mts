import { historySeasonInfo } from '../../src/lib/postseasonSeason'
for (const g of ['M', 'F'] as const) for (let y = 2013; y <= 2026; y++) {
  const h = await historySeasonInfo(g, y)
  if (h) console.log(g, y, JSON.stringify(h.regionName))
}
