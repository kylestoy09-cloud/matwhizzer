import { parseDualMeetText } from '../../src/lib/parseDualMeet'
import { parseDualMeetGirlsText } from '../../src/lib/parseDualMeetGirls'
import { parseRtfText } from '../../src/lib/parseRtf'
const dual = `Whippany Park vs. Hanover Park (01/10/2026)
Weight	Summary	WHPA	HAPA
113	Charles (CJ) Palmisano (Whippany Park) over John Doe (Hanover Park) (Fall 1:23)	6	0
Team Score:	6	0`
for (const [n, f] of [['boys dual', parseDualMeetText], ['girls dual', parseDualMeetGirlsText]] as const) {
  try { const r: any = (f as any)(dual); const b = r?.[0]?.matches?.[0] ?? r?.[0]?.bouts?.[0]; console.log(n, JSON.stringify(b ?? r).slice(0, 300)) } catch (e) { console.log(n, 'error', String(e).slice(0, 120)) }
}
