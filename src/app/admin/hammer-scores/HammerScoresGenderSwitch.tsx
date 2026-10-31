'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { HammerScoresPageClientBoys } from './HammerScoresPageClientBoys'
import { HammerScoresPageClientGirls } from './HammerScoresPageClientGirls'

// Follows the admin gender toggle. Waits for the saved toggle to load so a girls
// session never fetches the boys ratings first.
export function HammerScoresGenderSwitch() {
  const { gender, loaded } = useAdminGender()
  if (!loaded) return null
  return gender === 'F' ? <HammerScoresPageClientGirls /> : <HammerScoresPageClientBoys />
}
