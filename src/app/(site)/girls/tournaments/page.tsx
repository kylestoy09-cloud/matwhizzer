import { TournamentsList } from '@/app/(site)/tournaments/TournamentsList'

export const revalidate = 300

export default async function GirlsTournamentsPage({ searchParams }: { searchParams: Promise<{ month?: string; kind?: string }> }) {
  const { month, kind } = await searchParams
  return <TournamentsList gender="F" month={month} kind={kind === 'jamborees' ? 'jamborees' : 'tournaments'} />
}
