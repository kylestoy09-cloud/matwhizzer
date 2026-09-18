'use client'

import { useEffect, useState, useCallback } from 'react'

type Profile = {
  id: string
  role: string
  display_name: string | null
  email: string | null
  last_sign_in: string | null
  created_at: string
}

type Tab = 'admins' | 'all'

export function AdminProfilesClient() {
  const [tab, setTab] = useState<Tab>('admins')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Password reset
  const [resetting, setResetting] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState<Record<string, boolean>>({})

  // Inline display name editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Promote to admin
  const [promotingId, setPromotingId] = useState<string | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  const load = useCallback(async (view: Tab) => {
    setLoading(true)
    setError(null)
    try {
      const url = view === 'all' ? '/api/admin/admin-profiles?view=all' : '/api/admin/admin-profiles'
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setProfiles(json.profiles)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  function switchTab(t: Tab) {
    setTab(t)
    setEditingId(null)
    setResetDone({})
  }

  async function handleReset(email: string) {
    setResetting(email)
    try {
      const res = await fetch('/api/admin/admin-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setResetDone(prev => ({ ...prev, [email]: true }))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error generating reset link')
    } finally {
      setResetting(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    setAddSuccess(false)
    try {
      const res = await fetch('/api/admin/admin-profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), display_name: newName.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setAddSuccess(true)
      setNewEmail('')
      setNewName('')
      await load(tab)
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Error')
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveName(id: string) {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/admin-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, display_name: editName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, display_name: editName.trim() || null } : p))
      setEditingId(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSavingId(null)
    }
  }

  async function handlePromote(id: string) {
    setPromotingId(id)
    try {
      const res = await fetch('/api/admin/admin-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: 'admin' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, role: 'admin' } : p))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error promoting user')
    } finally {
      setPromotingId(null)
    }
  }

  function fmt(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['admins', 'all'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'admins' ? 'Admins' : 'All Users'}
          </button>
        ))}
      </div>

      {/* Add Admin button / form — only on Admins tab */}
      {tab === 'admins' && (
        <div>
          {!showAdd ? (
            <button
              onClick={() => { setShowAdd(true); setAddSuccess(false); setAddError(null) }}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              + Add Admin User
            </button>
          ) : (
            <form onSubmit={handleAdd} className="border border-slate-200 dark:border-slate-700 rounded p-4 max-w-sm space-y-3">
              <p className="text-sm font-semibold">Add Admin User</p>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              {addSuccess && <p className="text-xs text-green-600">Invite sent! User added.</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {adding ? 'Sending…' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddError(null); setAddSuccess(false) }}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : profiles.length === 0 ? (
        <p className="text-slate-400 text-sm">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-1 text-left font-semibold text-slate-600 dark:text-slate-400">Display Name</th>
                <th className="px-3 py-1 text-left font-semibold text-slate-600 dark:text-slate-400">Email</th>
                {tab === 'all' && <th className="px-3 py-1 text-left font-semibold text-slate-600 dark:text-slate-400">Role</th>}
                <th className="px-3 py-1 text-left font-semibold text-slate-600 dark:text-slate-400">Last Sign-in</th>
                <th className="px-3 py-1 text-left font-semibold text-slate-600 dark:text-slate-400">Created</th>
                <th className="px-3 py-1 text-left font-semibold text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profiles.map(p => (
                <tr key={p.id}>
                  <td className="px-3 py-1 text-slate-800 dark:text-slate-200">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveName(p.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                        />
                        <button
                          onClick={() => handleSaveName(p.id)}
                          disabled={savingId === p.id}
                          className="px-1.5 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
                        >
                          {savingId === p.id ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.display_name ?? '') }}
                        className="text-left hover:underline hover:text-blue-600 transition-colors"
                      >
                        {p.display_name ?? <span className="text-slate-400 italic">— click to set</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-1 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {p.email ?? '—'}
                  </td>
                  {tab === 'all' && (
                    <td className="px-3 py-1">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                        p.role === 'admin'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {p.role}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-1 text-slate-600 dark:text-slate-400">{fmt(p.last_sign_in)}</td>
                  <td className="px-3 py-1 text-slate-600 dark:text-slate-400">{fmt(p.created_at)}</td>
                  <td className="px-3 py-1">
                    <div className="flex items-center gap-2">
                      {tab === 'all' && p.role !== 'admin' && (
                        <button
                          onClick={() => handlePromote(p.id)}
                          disabled={promotingId === p.id}
                          className="px-2 py-0.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition-colors"
                        >
                          {promotingId === p.id ? '…' : 'Make Admin'}
                        </button>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReset(p.email!)}
                            disabled={resetting === p.email}
                            className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
                          >
                            {resetting === p.email ? 'Sending…' : 'Reset Password'}
                          </button>
                          {resetDone[p.email] && (
                            <span className="text-xs text-green-600 dark:text-green-400">Email sent.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
