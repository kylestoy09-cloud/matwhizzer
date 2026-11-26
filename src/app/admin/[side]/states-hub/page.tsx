import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// The State tab of the Tournament Hub (Kyle 2026-11-26); this URL forwards there
export default async function StatesHubPage({ params }: { params: Promise<{ side: string }> }) {
  redirect(`/admin/${(await params).side}/tournament-hub?tab=state`)
}
