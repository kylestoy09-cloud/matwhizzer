import type { CSSProperties } from 'react'

// Logo facing direction per school_id.
// This is seeded into schools.logo_direction via migration 20260908_school_logo_direction.sql.
// The DB column is now the source of truth; this map is kept as a reference only.
export const LOGO_DIRECTION: Record<number, 'left' | 'right'> = {
  1: 'right', 2: 'right', 3: 'right', 4: 'right', 5: 'right', 7: 'right',
  8: 'left', 10: 'right', 11: 'right', 12: 'right', 13: 'left', 14: 'left',
  15: 'right', 16: 'right', 17: 'right', 19: 'left', 20: 'right', 21: 'right',
  24: 'right', 25: 'right', 26: 'left', 28: 'left', 29: 'right', 31: 'left',
  32: 'left', 33: 'right', 34: 'left', 35: 'left', 36: 'right', 37: 'left',
  38: 'left', 39: 'right', 40: 'right', 41: 'left', 42: 'left', 43: 'right',
  44: 'right', 45: 'left', 46: 'right', 49: 'left', 50: 'right', 52: 'right',
  53: 'right', 56: 'left', 58: 'left', 59: 'left', 60: 'right', 61: 'right',
  62: 'right', 63: 'left', 66: 'left', 67: 'left', 70: 'right', 74: 'right',
  75: 'right', 76: 'right', 77: 'right', 79: 'right', 80: 'left', 81: 'right',
  82: 'right', 83: 'right', 84: 'right', 89: 'left', 97: 'left', 98: 'left',
  99: 'left', 101: 'right', 102: 'right', 103: 'left', 104: 'left', 105: 'left',
  107: 'left', 108: 'left', 109: 'left', 110: 'left', 111: 'right', 112: 'left',
  113: 'right', 114: 'right', 115: 'left', 117: 'right', 118: 'left', 119: 'right',
  120: 'right', 121: 'left', 122: 'right', 123: 'right', 124: 'left', 125: 'right',
  126: 'right', 127: 'left', 129: 'right', 130: 'right', 131: 'right', 132: 'right',
  133: 'left', 134: 'left', 136: 'left', 138: 'right', 139: 'left', 141: 'left',
  144: 'right', 145: 'right', 147: 'right', 148: 'left', 149: 'right', 150: 'right',
  151: 'left', 152: 'left', 153: 'right', 154: 'left', 155: 'left', 157: 'left',
  158: 'left', 159: 'right', 163: 'right', 166: 'right', 167: 'left', 168: 'right',
  169: 'left', 171: 'right', 172: 'right', 174: 'left', 177: 'left', 181: 'left',
  182: 'right', 185: 'left', 186: 'left', 189: 'right', 193: 'right', 195: 'left',
  197: 'left', 198: 'left', 199: 'left', 200: 'left', 203: 'right', 204: 'right',
  206: 'right', 207: 'right', 208: 'left', 209: 'left', 211: 'right', 213: 'left',
  215: 'left', 217: 'left', 218: 'right', 220: 'left', 221: 'right', 222: 'left',
  223: 'left', 224: 'right', 227: 'right', 229: 'right', 235: 'left', 236: 'right',
  237: 'left', 238: 'right', 240: 'left', 241: 'left', 243: 'left', 245: 'left',
  246: 'right', 248: 'right', 249: 'right', 250: 'right', 251: 'right', 253: 'left',
  255: 'left', 256: 'right', 257: 'left', 258: 'left', 260: 'left', 262: 'right',
  265: 'left', 266: 'right', 267: 'right', 271: 'left', 272: 'right', 273: 'right',
  274: 'left', 278: 'left', 279: 'left', 280: 'left', 281: 'right', 282: 'right',
  283: 'right', 284: 'right', 285: 'left', 286: 'right', 287: 'left', 289: 'right',
  291: 'left', 292: 'right', 293: 'right', 294: 'left', 301: 'right', 303: 'left', 304: 'left',
  306: 'right', 311: 'right', 312: 'right', 314: 'left', 315: 'left', 321: 'right',
  322: 'left', 356: 'right', 360: 'right', 364: 'right', 369: 'left', 370: 'right',
  379: 'left', 381: 'right', 383: 'left', 388: 'left', 393: 'right', 394: 'right',
  397: 'left',
}

// Away (left side of card) should face right; home (right side) should face left.
// Pass the school's logo_direction from the DB (or null/undefined for forward-facing logos).
export function logoFlipStyle(
  direction: 'left' | 'right' | null | undefined,
  position: 'away' | 'home',
): CSSProperties {
  if (!direction) return {}
  const needsFlip = position === 'away' ? direction === 'left' : direction === 'right'
  return needsFlip ? { transform: 'scaleX(-1)' } : {}
}

// Fallback for callsites that only have a schoolId and no DB direction.
// Prefer passing direction from DB instead.
export function logoFlipStyleById(
  schoolId: number | null | undefined,
  position: 'away' | 'home',
): CSSProperties {
  if (!schoolId) return {}
  return logoFlipStyle(LOGO_DIRECTION[schoolId] ?? null, position)
}
