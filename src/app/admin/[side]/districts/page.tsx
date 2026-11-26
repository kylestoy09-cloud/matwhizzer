import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// The District tab of the Tournament Hub (Kyle 2026-11-26: one hub, 5 tabs); this URL forwards there
export default async function DistrictsPage({ params }: { params: Promise<{ side: string }> }) {
  redirect(`/admin/${(await params).side}/tournament-hub?tab=district`)
}
