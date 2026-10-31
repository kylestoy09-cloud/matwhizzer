import BoysPage from './BoysPage'
import GirlsPage from './GirlsPage'

export const dynamic = 'force-dynamic'

// One address per side; each gender keeps its own page
export default async function Page({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  return side === 'girls' ? <GirlsPage /> : <BoysPage />
}
