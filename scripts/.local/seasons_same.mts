import { getSeasons, getHistorySeasons } from '../../src/lib/seasons-server'
const s = await getSeasons()
console.log('getSeasons', s.map(x => `${x.id}:${x.label}:${JSON.stringify(x.stages)}:pub=${x.public_genders}`).join(' | '))
console.log('history M', JSON.stringify(await getHistorySeasons('M')))
