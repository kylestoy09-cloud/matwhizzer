// A district / region / state weight's bracket in the site's standard format (Kyle 2026-11-25: "convert every bracket
// to this and have this be the standard format moving forward"): the same compact split bracket as the tournament
// pages (SplitBracket), with the saved Aesthetic-tool bracket settings. Bouts are placed by seed slot, or from who
// wrestled whom when the slots don't fit (src/lib/postseasonBracket.ts).
import { SplitBracket } from '@/components/bracket/SplitBracket'
import { buildPostseasonBracket, type PostseasonMatch } from '@/lib/postseasonBracket'
import type { BracketLook } from '@/lib/bracketLook'

export function PostseasonBracket({ matches, size, look, gender, prelims = false }: { matches: PostseasonMatch[]; size: 32 | 16; look: BracketLook; gender: 'M' | 'F'; prelims?: boolean }) {
  const bracket = buildPostseasonBracket(matches, size, { prelims })
  if (!bracket.champ.length && !bracket.cons.length && !bracket.other.length) return null
  return (
    <section className="mt-6">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Championship</p>
      <SplitBracket bracket={bracket} look={{ ...look, profileBase: gender === 'F' ? '/girls/wrestler' : '/boys/wrestler' }} mixed={false} />
    </section>
  )
}
