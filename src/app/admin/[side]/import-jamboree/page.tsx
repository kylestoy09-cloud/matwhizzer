import { notFound } from 'next/navigation'
import GirlsPage from './GirlsPage'

export const dynamic = 'force-dynamic'

// Girls only: boys jamborees import through the regular dual meet import
export default async function Page({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  if (side !== 'girls') notFound()
  return <GirlsPage />
}
