import { LeaderboardsPage } from '../../_leaderboards/LeaderboardsPage'

export const revalidate = 300

export default function BoysLeaderboardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LeaderboardsPage gender="M" searchParams={searchParams} />
}
