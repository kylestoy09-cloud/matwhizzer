import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Playoff History Review (Kyle 2026-11-13): one per side — boys 2013-2024 districts, regions and state; girls 2019-2024
// regions and state (girls had no districts before 2025-26)
// Lives under the Tournament Hub's District / Region / State tabs (History switch) since 2026-11-26; this URL forwards
export default async function Page({ params }: { params: Promise<{ side: string }> }) {
  redirect(`/admin/${(await params).side}/tournament-hub?tab=district&history=1`)
}

