// Site look, shared by every public page: region and district button colors and the standard page
// frame. Tuned in Admin → Settings → Aesthetic Tool; approved values are written here (2026-11-06,
// Kyle). Boys and girls each have their own palette.

export type TileColors = { bg: string; fg: string }

// Boys: odd regions are four navy shades (1 lightest → 7 darkest) with numbers in region 8's gray;
// even regions are four light grays (2 nearly white → 8 a regular gray) with numbers in region 7's navy.
export const BOYS_REGION_BG: Record<number, string> = {
  1: '#4A6A9C', 3: '#34507E', 5: '#243C63', 7: '#16284A',
  2: '#F4F5F7', 4: '#E3E6EA', 6: '#CDD1D7', 8: '#A9AEB6',
}

// Girls: the same idea in the girls colors. Regions 1 and 3 are rose shades (1 lighter), 2 and 4 light
// grays (2 lighter); numbers on rose use region 4's gray, numbers on gray use region 3's rose.
export const GIRLS_REGION_BG: Record<number, string> = {
  1: '#BE4A6E', 3: '#881337',
  2: '#F4F5F7', 4: '#CDD1D7',
}

export function regionTile(regionBg: Record<number, string>, region: number): TileColors {
  const regions = Object.keys(regionBg).map(Number)
  const odd = regions.filter(r => r % 2 === 1), even = regions.filter(r => r % 2 === 0)
  const darkestOdd = regionBg[Math.max(...odd)], darkestEven = regionBg[Math.max(...even)]
  return region % 2 === 1 ? { bg: regionBg[region], fg: darkestEven } : { bg: regionBg[region], fg: darkestOdd }
}

// The region each district advances to (NJSIAA alignment: boys districts 1–32 → regions 1–8, four
// each; girls 2025-26 districts 1–12 → regions 1–4, three each). District buttons take their region's color.
export const boysRegionOfDistrict = (district: number) => Math.ceil(district / 4)
export const girlsRegionOfDistrict = (district: number) => Math.ceil(district / 3)

// Stencil fonts the Aesthetic Tool offers for button numbers (all on Google Fonts via next/font)
export const STENCIL_FONTS = ['Stardos Stencil', 'Saira Stencil One', 'Big Shoulders Stencil', 'Allerta Stencil'] as const
export type StencilFont = (typeof STENCIL_FONTS)[number]
