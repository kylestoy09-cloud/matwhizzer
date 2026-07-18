import { redirect } from 'next/navigation'

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string }>
}) {
  const { gender } = await searchParams
  redirect(gender === 'girls' ? '/girls/schools' : '/boys/schools')
}
