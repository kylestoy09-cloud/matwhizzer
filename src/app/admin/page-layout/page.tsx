import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { LayoutClient } from './LayoutClient'

export const dynamic = 'force-dynamic'

export default function PageLayoutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Page Layout</h1>
      <p className="text-sm text-slate-500 mb-8">
        Control the order and visibility of sections on public-facing pages. Changes take
        effect immediately — no redeploy needed.
      </p>
      <LayoutClient />
    </div>
  )
}
