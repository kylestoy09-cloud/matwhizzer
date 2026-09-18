export const dynamic = 'force-dynamic'
export const revalidate = 0

import { SchoolProfileCore } from '@/app/(site)/schools/_shared/SchoolProfileCore'

export default async function GirlsSchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { school } = await params
  const { tab } = await searchParams
  return <SchoolProfileCore schoolParam={school} gender="girls" activeTab={tab ?? 'postseason'} />
}
