import { matchWrestler, reloadAliases } from '../../src/lib/matchWrestlers'
await reloadAliases()
const girls: [string, number, number][] = [['River Wojcik', 286, 126], ['Aleyce Perez', 258, 126], ['Everleigh Whitham', 258, 132]]
for (const [n, s, w] of girls) { const r = await matchWrestler(n, s, w, 'F'); console.log('F', n, r.wrestlerId, r.confidence, r.displayName) }
const D = 290, C = 558
const boys: [string, number, number][] = [['Adam Froehlich',D,106],['Preet Panchal',C,106],['Christopher Powell',D,113],['Dean Capuano',C,113],['Reid Lightfoot',D,120],['Jack McInerney',C,120],['Dante DePaul',D,126],['Chase Mancini',C,126],['Greyson Pettit',D,132],['Caleb Karcher',C,132],['Amari Vann',D,138],['Cade Minter',C,138],['Anthony Depaul',D,144],['Henry Goddard',C,144],['lucas coesfeld',D,150],['Rustamjon Farkhodov',C,150],['Jamison Devlin',D,157],['nolan bryne',D,175],['cameron pote',D,190],['Chase Klein',C,190],['Jake Young',C,285],['Christopher Diaz',D,285]]
for (const [n, s, w] of boys) { const r = await matchWrestler(n, s, w, 'M'); console.log('M', n, r.wrestlerId, r.confidence, r.displayName) }
