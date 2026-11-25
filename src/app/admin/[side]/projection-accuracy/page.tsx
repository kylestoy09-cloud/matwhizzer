import { redirect } from 'next/navigation'

// Projection Accuracy is a tab on the WRR Formula page (Kyle 2026-11-20); this address still works
export default async function ProjectionAccuracyPage({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  redirect(`/admin/${side}/hammer-scores/config?tab=projections`)
}
