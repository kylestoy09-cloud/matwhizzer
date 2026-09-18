'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Ticket = {
  id: string
  created_at: string
  description: string
  is_urgent: boolean
  status: 'open' | 'resolved'
  resolved_at: string | null
  submitted_by_email: string
  submitted_by_name: string | null
  screenshot_urls: string[]
}

export function HelpDeskClient() {
  const [tab, setTab]               = useState<'open' | 'resolved'>('open')
  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [lightbox, setLightbox]     = useState<string | null>(null)

  // New ticket form state
  const [desc, setDesc]             = useState('')
  const [urgent, setUrgent]         = useState(false)
  const [files, setFiles]           = useState<File[]>([])
  const [previews, setPreviews]     = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  const load = useCallback(async (status: 'open' | 'resolved') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/help-desk?status=${status}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load tickets')
      setTickets(json.tickets)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab) }, [load, tab])

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    const combined = [...files, ...picked].slice(0, 3)
    setFiles(combined)
    setPreviews(combined.map(f => URL.createObjectURL(f)))
  }

  function removeFile(i: number) {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    setPreviews(next.map(f => URL.createObjectURL(f)))
  }

  function resetForm() {
    setDesc('')
    setUrgent(false)
    setFiles([])
    setPreviews([])
    setFormError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submit() {
    if (!desc.trim()) { setFormError('Description is required'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      let screenshotUrls: string[] = []
      if (files.length > 0) {
        const fd = new FormData()
        files.forEach(f => fd.append('files', f))
        const upRes = await fetch('/api/admin/help-desk/upload', { method: 'POST', body: fd })
        const upJson = await upRes.json()
        if (!upRes.ok) throw new Error(upJson.error ?? 'Upload failed')
        screenshotUrls = upJson.urls
      }

      const res = await fetch('/api/admin/help-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, is_urgent: urgent, screenshot_urls: screenshotUrls }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit')

      resetForm()
      setShowForm(false)
      if (tab === 'open') load('open')
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  async function resolve(id: string) {
    try {
      const res = await fetch(`/api/admin/help-desk/${id}`, { method: 'PATCH' })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error) }
      load(tab)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to resolve')
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Screenshot" className="max-w-full max-h-full rounded shadow-2xl" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['open', 'resolved'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowForm(false) }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t === 'open' ? 'Open' : 'Resolved'}
            </button>
          ))}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            + New Ticket
          </button>
        )}
      </div>

      {/* New ticket form */}
      {showForm && (
        <div className="mb-6 border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">New Ticket</h2>

          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe the issue…"
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />

          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={urgent}
                onChange={e => setUrgent(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Urgent</span>
            </label>
          </div>

          {/* Screenshot picker */}
          <div className="mb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Screenshots (up to 3)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-20 h-20 object-cover rounded border border-slate-300 dark:border-slate-600" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                </div>
              ))}
              {files.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-colors text-2xl"
                >+</button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilePick}
            />
          </div>

          {formError && <p className="text-sm text-red-500 mb-3">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded transition-colors"
            >Cancel</button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors"
            >{submitting ? 'Submitting…' : 'Submit Ticket'}</button>
          </div>
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tab === 'open' ? 'No open tickets.' : 'No resolved tickets.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map(t => (
            <div
              key={t.id}
              className={`border rounded-lg p-4 bg-white dark:bg-slate-800/60 ${
                t.is_urgent
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {t.is_urgent && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded">
                        Urgent
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{fmt(t.created_at)}</span>
                    {t.status === 'resolved' && t.resolved_at && (
                      <span className="text-xs text-slate-400">· Resolved {fmt(t.resolved_at)}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words mb-2">
                    {t.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.submitted_by_name
                      ? `${t.submitted_by_name} · ${t.submitted_by_email}`
                      : t.submitted_by_email}
                  </p>
                </div>
                {t.status === 'open' && (
                  <button
                    onClick={() => resolve(t.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  >Resolve</button>
                )}
              </div>

              {t.screenshot_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {t.screenshot_urls.map((url, i) => (
                    <button key={i} onClick={() => setLightbox(url)} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Screenshot ${i + 1}`}
                        className="w-24 h-24 object-cover rounded border border-slate-200 dark:border-slate-600 group-hover:opacity-80 transition-opacity"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
