import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { ArticleForm } from '../ArticleForm'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-6">Edit Article</h1>
      <ArticleForm id={id} />
    </div>
  )
}
