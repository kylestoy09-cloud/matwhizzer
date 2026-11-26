import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// The Team postseason tab of the Tournament Hub (Kyle 2026-11-26); this URL forwards there
export default async function TeamPlayoffsPage({ params }: { params: Promise<{ side: string }> }) {
  redirect(`/admin/${(await params).side}/tournament-hub?tab=team`)
}
