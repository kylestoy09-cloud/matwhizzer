import { DailyReport } from '@/components/insight/DailyReport'

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <DailyReport side="boys" tab={tab} />
}
