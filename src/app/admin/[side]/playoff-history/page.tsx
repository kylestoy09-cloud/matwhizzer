import { PlayoffHistoryClient } from './PlayoffHistoryClient'

export const dynamic = 'force-dynamic'

// Playoff History Review (Kyle 2026-11-13): one per side — boys 2013-2024 districts, regions and state; girls 2019-2024
// regions and state (girls had no districts before 2025-26)
export default function Page() {
  return <PlayoffHistoryClient />
}
