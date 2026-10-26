import { supabase } from '@/lib/supabase/public-cached'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { marked } from 'marked'

export const revalidate = 300

type Article = {
  id: string
  title: string
  slug: string
  body: string
  author: string
  published_at: string
  updated_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabase
    .from('articles')
    .select('title')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return { title: data?.title ? `${data.title} — MatWhizzer` : 'Article — MatWhizzer' }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, body, author, published_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) notFound()
  const article = data as Article

  const html = await marked(article.body ?? '', { async: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href="/articles"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors"
      >
        ← All articles
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-3">
        {article.title}
      </h1>

      <p className="text-xs text-slate-400 mb-8">
        {article.published_at && fmtDate(article.published_at)}
        {article.author && ` · ${article.author}`}
      </p>

      <div
        className="article-body text-slate-800 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html as string }}
      />
    </div>
  )
}
