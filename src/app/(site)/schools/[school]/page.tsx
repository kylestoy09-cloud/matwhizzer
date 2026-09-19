export const revalidate = 300

import { redirect } from 'next/navigation'

// Redirect legacy ?gender= URLs to the new gender-prefix paths.
// /schools/238?gender=girls  →  /girls/schools/238
// /schools/238               →  /boys/schools/238
export default async function SchoolProfileRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>
  searchParams: Promise<{ gender?: string; tab?: string }>
}) {
  const { school } = await params
  const { gender, tab } = await searchParams

  const prefix = gender === 'girls' ? 'girls' : 'boys'
  const qs = tab ? `?tab=${tab}` : ''
  redirect(`/${prefix}/schools/${school}${qs}`)
}
