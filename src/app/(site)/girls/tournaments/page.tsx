import { TournamentsList } from '@/app/(site)/tournaments/TournamentsList'

export const revalidate = 300

export default async function GirlsTournamentsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams
  return <TournamentsList gender="F" month={month} />
}
