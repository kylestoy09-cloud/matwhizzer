export const revalidate = 300

import { GirlsStandingsContent } from '@/app/(site)/standings/GirlsStandingsContent'
import { standingsView } from '@/app/(site)/standings/StandingsContent'

export default async function GirlsStandingsPage({ searchParams }: { searchParams: Promise<{ view?: string; group?: string }> }) {
  const { view, group } = await searchParams
  return <GirlsStandingsContent view={standingsView(view)} group={group} />
}
