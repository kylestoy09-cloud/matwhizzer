/** Section and Group slug utilities */

const SECTIONS = ['North I', 'North II', 'Central', 'South', 'Non-Public'] as const
const PUBLIC_GROUPS = ['1', '2', '3', '4', '5'] as const
const NP_GROUPS = ['A', 'B'] as const
const ALL_GROUPS = [...PUBLIC_GROUPS, ...NP_GROUPS] as const

export type SectionName = (typeof SECTIONS)[number]
export type GroupName = (typeof ALL_GROUPS)[number]

// Section slugs
const SECTION_SLUG_MAP: Record<string, string> = {
  'North I': 'north-i',
  'North II': 'north-ii',
  'Central': 'central',
  'South': 'south',
  'Non-Public': 'non-public',
}

const SLUG_SECTION_MAP: Record<string, string> = {}
for (const [name, slug] of Object.entries(SECTION_SLUG_MAP)) {
  SLUG_SECTION_MAP[slug] = name
}

export function sectionToSlug(name: string): string {
  return SECTION_SLUG_MAP[name] ?? name.toLowerCase().replace(/\s+/g, '-')
}

export function sectionFromSlug(slug: string): string | null {
  return SLUG_SECTION_MAP[slug] ?? null
}

// Group slugs
export function groupToSlug(classification: string): string {
  return `group-${classification.toLowerCase()}`
}

export function groupFromSlug(slug: string): string | null {
  const match = slug.match(/^group-([1-5ab])$/)
  if (!match) return null
  return match[1].toUpperCase() === match[1] ? match[1] : match[1].toUpperCase()
}

// For groups, we store "1"-"5" and "A"-"B" in the DB classification column
// groupFromSlug('group-1') → '1', groupFromSlug('group-a') → 'A'
export function groupFromSlugRaw(slug: string): string | null {
  const match = slug.match(/^group-([1-5])$/)
  if (match) return match[1]
  const matchLetter = slug.match(/^group-([ab])$/i)
  if (matchLetter) return matchLetter[1].toUpperCase()
  return null
}

export function getAllSections() {
  return SECTIONS.map(name => ({ name, slug: sectionToSlug(name) }))
}

export function getAllGroups() {
  return ALL_GROUPS.map(g => ({
    name: g,
    slug: groupToSlug(g),
    label: isNaN(Number(g)) ? `Non-Public ${g}` : `Group ${g}`,
  }))
}

export function getGroupsForSection(section: string): string[] {
  if (section === 'Non-Public') return [...NP_GROUPS]
  return [...PUBLIC_GROUPS]
}

export function getSectionsForGroup(group: string): string[] {
  if (group === 'A' || group === 'B') return ['Non-Public']
  return ['North I', 'North II', 'Central', 'South']
}

export function formatSectionGroup(section: string | null, classification: string | null): string | null {
  if (!section || !classification) return null
  if (section === 'Non-Public') return `Non-Public ${classification}`
  return `${section} Group ${classification}`
}
