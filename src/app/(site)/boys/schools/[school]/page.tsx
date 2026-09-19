export const revalidate = 300

import { SchoolProfileCore } from '@/app/(site)/schools/_shared/SchoolProfileCore'

export default async function BoysSchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { school } = await params
  const { tab } = await searchParams
  return <SchoolProfileCore schoolParam={school} gender="boys" activeTab={tab ?? 'schedule'} />
}
