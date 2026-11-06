import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { AestheticClient } from './AestheticClient'

export const dynamic = 'force-dynamic'

export default function AestheticToolPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Aesthetic Tool</h1>
      <p className="text-sm text-slate-500 mb-6">
        Preview the standard page look: page header and season row, region and district buttons, group
        buttons and tables. Nothing here changes the live site. When a look is approved, copy its settings
        and it gets written into the site theme (src/lib/siteTheme.ts) for every page.
      </p>
      <AestheticClient />
    </div>
  )
}
