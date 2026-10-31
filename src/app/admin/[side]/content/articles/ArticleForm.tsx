'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ArticleFormProps = {
  id?: string
}

function slugify(title: string) {
  return title.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function ArticleForm({ id }: ArticleFormProps) {
  const router = useRouter()
  const isNew = !id

  const [title,   setTitle]   = useState('')
  const [slug,    setSlug]    = useState('')
  const [body,    setBody]    = useState('')
  const [author,  setAuthor]  = useState('')
  const [status,  setStatus]  = useState<'draft' | 'published'>('draft')
  const [slugTouched, setSlugTouched] = useState(false)

  const [loading,  setLoading]  = useState(!isNew)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Load existing article
  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/articles/${id}`)
      .then(r => r.json())
      .then(d => {
        const a = d.article
        setTitle(a.title ?? '')
        setSlug(a.slug ?? '')
        setBody(a.body ?? '')
        setAuthor(a.author ?? '')
        setStatus(a.status ?? 'draft')
        setSlugTouched(true)
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false))
  }, [id])

  // Auto-generate slug from title while untouched
  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title))
  }, [title, slugTouched])

  async function save(publishStatus: 'draft' | 'published') {
    setSaving(true); setError(null)
    const payload = { title, slug, body, author, status: publishStatus }
    try {
      const res = await fetch(
        isNew ? '/api/admin/articles' : `/api/admin/articles/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      router.push('/admin/content/articles')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !confirm('Delete this article? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
      router.push('/admin/content/articles')
      router.refresh()
    } catch {
      setError('Delete failed')
      setDeleting(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400 py-8">Loading…</p>

  return (
    <div className="max-w-2xl space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Article title"
          className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
          Slug <span className="text-slate-400 normal-case font-normal">(URL: /articles/slug)</span>
        </label>
        <input
          type="text"
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
          placeholder="article-url-slug"
          className="w-full border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-500"
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
          Author
        </label>
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Author name"
          className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
          Body <span className="text-slate-400 normal-case font-normal">(Markdown)</span>
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={20}
          placeholder="Write your article in Markdown…&#10;&#10;## Heading&#10;&#10;Paragraph text. **Bold**, *italic*, [link](url).&#10;&#10;- List item"
          className="w-full border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-500 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <button
          onClick={() => save('published')}
          disabled={saving || !title || !slug}
          className="px-4 py-2 text-sm font-semibold bg-emerald-700 text-white border border-emerald-700 hover:bg-emerald-800 disabled:opacity-40 transition-colors"
        >
          {saving && status === 'published' ? 'Saving…' : status === 'published' ? 'Save Published' : 'Publish'}
        </button>
        <button
          onClick={() => save('draft')}
          disabled={saving || !title || !slug}
          className="px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          {status === 'draft' ? 'Save Draft' : 'Unpublish → Draft'}
        </button>
        <button
          onClick={() => router.push('/admin/content/articles')}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto px-3 py-2 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete article'}
          </button>
        )}
      </div>
    </div>
  )
}
