import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 300
export const metadata = { title: 'Articles — MatWhizzer' }

type Article = {
  id: string
  title: string
  slug: string
  author: string
  published_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default async function ArticlesPage() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, author, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) notFound()
  const articles = (data ?? []) as Article[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Articles</h1>
      <p className="text-sm text-slate-500 mb-8">News and analysis from MatWhizzer</p>

      {articles.length === 0 ? (
        <p className="text-slate-400 text-sm">No articles published yet.</p>
      ) : (
        <div className="space-y-6">
          {articles.map(a => (
            <div key={a.id} className="border-b border-slate-100 pb-6">
              <Link
                href={`/articles/${a.slug}`}
                className="block group"
              >
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-1">
                  {a.title}
                </h2>
              </Link>
              <p className="text-xs text-slate-400">
                {a.published_at && fmtDate(a.published_at)}
                {a.author && ` · ${a.author}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
