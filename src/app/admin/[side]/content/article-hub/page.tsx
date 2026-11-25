import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { ArticleHubClient } from './ArticleHubClient'

export const dynamic = 'force-dynamic'

export default function ArticleHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="mt-4 mb-1 text-xl font-bold text-slate-900">Article Hub</h1>
      <p className="mb-4 text-sm text-slate-500">Every article has a publish time. Save each section, then save the article: it goes live at its time (8 AM for the automatic ones). Not saved by then = it doesn&apos;t publish. The red light pushes the time back.</p>
      <ArticleHubClient />
    </div>
  )
}
