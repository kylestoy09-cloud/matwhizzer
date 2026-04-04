/** Conference slug ↔ display name mapping */

const CONFERENCES = [
  'Big North Conference',
  'Burlington County Scholastic League',
  'Cape-Atlantic League',
  'Colonial Conference',
  'Colonial Valley Conference',
  'Greater Middlesex Conference',
  'Independent',
  'North Jersey Interscholastic Conference',
  'Northwest Jersey Athletic Conference',
  'Olympic Conference',
  'Shore Conference',
  'Skyland Conference',
  'Super Essex Conference',
  'Tri-County Conference',
  'Union County Interscholastic Athletic Conference',
] as const

export type ConferenceName = (typeof CONFERENCES)[number]

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Build bidirectional maps
const slugToName = new Map<string, string>()
const nameToSlug = new Map<string, string>()

for (const name of CONFERENCES) {
  const slug = toSlug(name)
  slugToName.set(slug, name)
  nameToSlug.set(name, slug)
}

export function conferenceFromSlug(slug: string): string | null {
  return slugToName.get(slug) ?? null
}

export function conferenceToSlug(name: string): string {
  return nameToSlug.get(name) ?? toSlug(name)
}

export function getAllConferences(): { name: string; slug: string }[] {
  return CONFERENCES.map(name => ({ name, slug: toSlug(name) }))
}
