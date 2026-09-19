export const revalidate = 300

import { StandingsContent } from '@/app/(site)/standings/StandingsContent'

export default function BoysStandingsPage() {
  return <StandingsContent gender="boys" />
}
