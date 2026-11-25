// Tournament and jamboree names repeat every season (Kyle 2026-11-11), so a stored name carries no year,
// edition number ("12th Annual"), trailing date, "Girls" or "Wrestling" (each program has its own list) and
// no "High School": "2026 NJAC Girls' Wrestling Championships" → "NJAC Championships".
export function cleanEventName(name: string): string {
  const cleaned = name
    .replace(/\s*-\s*\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/, '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\b\d+(st|nd|rd|th)\b/gi, '')
    .replace(/\bAnnual\b/gi, '')
    .replace(/\bWrestling\b/gi, '')
    .replace(/\bHigh School\b/gi, '')
    .replace(/\bGirls'?(?=[\s)]|$)|\bGirl[`'’]s\b/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ').replace(/\s+([,)])/g, '$1').replace(/^[\s,-]+|[\s,-]+$/g, '').trim()
  return cleaned || name.trim()
}
