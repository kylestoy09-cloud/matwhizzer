import { TournamentsList } from '@/app/(site)/tournaments/TournamentsList'

export const revalidate = 300

export default async function BoysTournamentsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams
  return <TournamentsList gender="M" month={month} />
}
