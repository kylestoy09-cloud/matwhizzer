export const dynamic = 'force-dynamic'

import { StandingsContent } from './StandingsContent'

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string }>
}) {
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  return <StandingsContent gender={gender} />
}
