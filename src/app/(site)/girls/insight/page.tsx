import { redirect } from 'next/navigation'

// Insight opens on its first tab
export default function Page() {
  redirect('/girls/insight/daily-report')
}
