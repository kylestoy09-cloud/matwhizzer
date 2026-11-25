import { matchWrestler } from '../../src/lib/matchWrestlers'
for (const [n, s, w] of [['Terrance (Jim) Fearon', 190, 126], ['Charles (Chuck) Palmisano', 119, 113], ['Ryan Kim', 42, 165], ['Ryan Kim', 35, 138]] as const) {
  const r = await matchWrestler(n, s, w, 'M'); console.log(`${n} @${s} →`, r.displayName, r.wrestlerId?.slice(0, 8), r.confidence)
}
process.exit(0)
