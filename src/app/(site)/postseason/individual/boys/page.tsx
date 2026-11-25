import { IndividualPostseason } from '../IndividualPostseason'

export default async function BoysPostseasonPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  return <IndividualPostseason gender="M" seasonParam={(await searchParams).season} />
}
