import { IndividualPostseason } from '../IndividualPostseason'

export default async function GirlsPostseasonPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  return <IndividualPostseason gender="F" seasonParam={(await searchParams).season} />
}
