import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { ArticleForm } from '../ArticleForm'

export default function NewArticlePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-6">New Article</h1>
      <ArticleForm />
    </div>
  )
}
