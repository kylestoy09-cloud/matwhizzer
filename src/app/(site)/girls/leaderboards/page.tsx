import { LeaderboardsPage } from '../../_leaderboards/LeaderboardsPage'

export const revalidate = 300

export default function GirlsLeaderboardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LeaderboardsPage gender="F" searchParams={searchParams} />
}
