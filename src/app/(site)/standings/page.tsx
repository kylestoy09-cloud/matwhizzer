export const revalidate = 300

import { StandingsContent, standingsView } from './StandingsContent'

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; view?: string }>
}) {
  const { gender: genderParam, view } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  return <StandingsContent gender={gender} view={standingsView(view)} base={`/${gender}/standings`} />
}
