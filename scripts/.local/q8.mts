import { parseJamboreeGirlsText } from '../../src/lib/parseJamboreeGirls'
for (const l of ['114','114C','120B2','114-120','126-126 A','107-107 B','185-235','1145','114-121']) {
  const r = parseJamboreeGirlsText(`${l}\nA B (X) over C D (Y) (Fall 1:00)\nNo\n`, '02/06/2026')
  console.log(JSON.stringify(l), r.map(m=>m.matches.map(b=>b.weightClass)).flat())
}
