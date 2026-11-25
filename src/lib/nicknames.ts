// Short and long forms of first names (Kyle 2026-11-13: "Zach Akers" in results is our "Zachary Akers"). Used by
// the hub import to offer a match it won't fill in by itself.
const FORMS: Record<string, string[]> = {
  zachary: ['zach', 'zack', 'zak'], zackary: ['zack', 'zach'], matthew: ['matt', 'matty'], mathew: ['matt'], michael: ['mike', 'mikey'],
  christopher: ['chris'], christian: ['chris'], nicholas: ['nick', 'nico'], nicolas: ['nick', 'nico'], anthony: ['tony', 'ant'],
  joseph: ['joe', 'joey'], jonathan: ['jon', 'jonny'], john: ['jack', 'johnny'], william: ['will', 'bill', 'billy', 'liam'],
  robert: ['rob', 'bobby', 'bob', 'robbie'], richard: ['rich', 'rick', 'richie'], thomas: ['tom', 'tommy'], daniel: ['dan', 'danny'],
  benjamin: ['ben', 'benny'], alexander: ['alex'], alexandra: ['alex', 'lexi'], andrew: ['andy', 'drew'], james: ['jim', 'jimmy', 'jamie'],
  edward: ['ed', 'eddie'], samuel: ['sam', 'sammy'], jacob: ['jake'], joshua: ['josh'], timothy: ['tim', 'timmy'], gabriel: ['gabe'],
  nathaniel: ['nate', 'nathan'], nathan: ['nate'], vincent: ['vinny', 'vince'], dominic: ['dom'], dominick: ['dom'], maxwell: ['max'],
  maximilian: ['max'], maximus: ['max'], gregory: ['greg'], stephen: ['steve'], steven: ['steve'], patrick: ['pat'],
  charles: ['charlie', 'chuck'], kenneth: ['ken', 'kenny'], ronald: ['ron', 'ronnie'], peter: ['pete'], cameron: ['cam'],
  abigail: ['abby'], elizabeth: ['liz', 'lizzie', 'beth', 'eliza'], katherine: ['kate', 'katie', 'kat'], kathryn: ['kate', 'katie'],
  isabella: ['bella', 'izzy'], isabel: ['izzy'], gianna: ['gia'], olivia: ['liv'], samantha: ['sam'], gabriella: ['gabby', 'gabi'],
  gabrielle: ['gabby', 'gabi'], victoria: ['tori'], madison: ['maddie'], madeline: ['maddie'], mackenzie: ['kenzie'],
}
/** Every other form of a first name: its short forms, the long forms it's short for, and their other short forms
 *  ("Matt" → Matthew, Matty). */
export function otherForms(first: string): string[] {
  const f = first.toLowerCase().trim()
  const longs = [...(FORMS[f] ? [f] : []), ...Object.entries(FORMS).filter(([, v]) => v.includes(f)).map(([k]) => k)]
  return [...new Set(longs.flatMap(l => [l, ...FORMS[l]]))].filter(x => x !== f)
}
