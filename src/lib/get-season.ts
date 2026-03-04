import { cookies } from 'next/headers'
export { SEASONS } from '@/lib/seasons'

/** Returns the active season ID (default = 2 for 2025-26). */
export async function getActiveSeason(): Promise<number> {
  const store = await cookies()
  const val = store.get('season')?.value
  const n = val ? parseInt(val) : NaN
  return Number.isFinite(n) && n >= 1 ? n : 2
}
