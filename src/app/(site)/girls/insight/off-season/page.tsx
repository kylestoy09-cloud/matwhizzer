import { OffseasonBoard } from '@/components/site/OffseasonBoard'
import { loadOffseasonBoard } from '@/lib/offseasonPublic'

// Insight · Off-Season (Kyle 2026-11-13; live 2026-11-14): notable offseason performances by our wrestlers
export const revalidate = 300

export default async function Page() {
  return <OffseasonBoard data={await loadOffseasonBoard('F')} side="girls" />
}
