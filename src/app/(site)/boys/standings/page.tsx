export const revalidate = 300

import { StandingsContent, standingsView } from '@/app/(site)/standings/StandingsContent'

export default async function BoysStandingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  return <StandingsContent gender="boys" view={standingsView(view)} base="/boys/standings" />
}
