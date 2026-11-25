// One college's page (Kyle 2026-11-18: shipped from the mock): its header, the stats board and every NJ wrestler with
// his awards by year. Data cached 5 minutes (src/lib/ncaa/collegePublic.ts).
import { notFound } from 'next/navigation'
import { CollegePageCore } from '@/components/site/CollegePages'

export const revalidate = 300

export default async function BoysCollegeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const cid = Number((await params).id)
  if (!Number.isInteger(cid) || cid <= 0) notFound()
  return <CollegePageCore cid={cid} />
}
