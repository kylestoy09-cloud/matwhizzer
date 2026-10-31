import { OosSchoolsClient } from './OosSchoolsClient'

export const metadata = { title: 'OOS Schools' }
export const dynamic = 'force-dynamic'

export default async function OosSchoolsPage({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  return <OosSchoolsClient gender={side === 'girls' ? 'F' : 'M'} />
}
