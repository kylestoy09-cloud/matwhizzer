// The Regular Season leaders response sends each school's details once (`schools`)
// rather than on every wrestler row; this puts them back on the rows.
const SCHOOL_FIELDS = ['school_name', 'section', 'classification', 'athletic_conference', 'logo_url', 'color_primary'] as const

export function unpackRsLeaders<T>(json: { wrestlers?: Record<string, unknown>[]; schools?: Record<string, unknown[]> }): T[] {
  const schools = json.schools ?? {}
  return (json.wrestlers ?? []).map(w => {
    const s = schools[String(w.school_id)]
    if (!s) return w as T
    const out: Record<string, unknown> = { ...w }
    SCHOOL_FIELDS.forEach((f, i) => { out[f] = s[i] ?? null })
    return out as T
  })
}
