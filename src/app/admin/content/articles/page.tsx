import { createClient } from '@supabase/supabase-js'
import { AdminBackButton } from '../../AdminBackButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '') }

type Article = {
  id: string
  title: string
  slug: string
  author: string
  status: 'draft' | 'published'
  published_at: string | null
  updated_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ArticlesListPage() {
  const { data } = await db()
    .from('articles')
    .select('id, title, slug, author, status, published_at, updated_at')
    .order('created_at', { ascending: false })

  const articles = (data ?? []) as Article[]

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Articles</h1>
          <p className="text-sm text-slate-500 mt-0.5">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/content/articles/new"
          className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
        >
          + New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded p-12 text-center text-sm text-slate-400">
          No articles yet. Create your first one.
        </div>
      ) : (
        <div className="border border-slate-200 rounded overflow-hidden divide-y divide-slate-100">
          {articles.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/content/articles/${a.id}`}
                  className="font-medium text-slate-900 hover:text-blue-600 transition-colors text-sm"
                >
                  {a.title}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  /articles/{a.slug}
                  {a.author && ` · ${a.author}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {a.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {a.status === 'published' && a.published_at
                    ? fmtDate(a.published_at)
                    : `Updated ${fmtDate(a.updated_at)}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
