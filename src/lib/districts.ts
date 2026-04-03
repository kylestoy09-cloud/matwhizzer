/** District and Region slug utilities */

export function districtToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function districtFromSlug(slug: string): { id: number; name: string } | null {
  const match = slug.match(/^district-(\d+)$/)
  if (!match) return null
  const num = parseInt(match[1])
  if (num < 1 || num > 32) return null
  return { id: num, name: `District ${num}` }
}

export function regionToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function regionFromSlug(slug: string): { id: number; name: string } | null {
  const match = slug.match(/^region-(\d+)$/)
  if (!match) return null
  const num = parseInt(match[1])
  if (num < 1 || num > 12) return null
  return { id: num, name: `Region ${num}` }
}
