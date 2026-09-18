'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Transfer = {
  id: string
  status: string
  detected_via: string
  created_at: string
  wrestlers: { id: string; first_name: string; last_name: string; gender: string }
  current_school: { id: number; display_name: string } | null
  suspected_school: { id: number; display_name: string }
}

export function TransfersWorkspace() {
  const [transfers,        setTransfers]        = useState<Transfer[]>([])
  const [migrationPending, setMigrationPending] = useState<boolean | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [scanning,         setScanning]         = useState(false)
  const [scanResult,       setScanResult]       = useState<{ scanned: number; created: number } | null>(null)
  const [actionLoading,    setActionLoading]    = useState<string | null>(null)
  const [flash,            setFlash]            = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/wrestler-transfers?status=pending')
      const d = await res.json()
      setMigrationPending(d.migrationPending ?? false)
      setTransfers(d.transfers ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleScan() {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/admin/wrestler-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      })
      const d = await res.json()
      if (d.error) { setFlash(d.error); return }
      setScanResult(d)
      await load()
    } finally {
      setScanning(false)
    }
  }

  async function handleAction(id: string, action: 'confirm' | 'reject') {
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/wrestler-transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const d = await res.json()
      if (d.error) { setFlash(d.error); return }
      setTransfers(prev => prev.filter(t => t.id !== id))
      setFlash(action === 'confirm' ? 'Transfer confirmed.' : 'Marked as not a transfer.')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="p-4">
      {flash && (
        <div className="mb-4 border border-green-200 bg-green-50 rounded px-4 py-2 text-sm text-green-800">{flash}</div>
      )}

      {migrationPending === true && (
        <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3 text-sm text-amber-800 mb-4">
          Apply <code className="font-mono text-xs">docs/migrations/20260824_pending_wrestler_transfers.sql</code> first.
        </div>
      )}

      {migrationPending === false && (
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 border border-slate-300 text-sm rounded font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {scanning ? 'Scanning…' : 'Scan for Transfer Candidates'}
          </button>
          {scanResult && (
            <p className="text-sm text-slate-500">
              Scanned {scanResult.scanned} — {scanResult.created} new flag{scanResult.created !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && !migrationPending && transfers.length === 0 && (
        <p className="text-sm text-slate-400">No pending transfers. Run the scan to detect new ones.</p>
      )}

      {!loading && transfers.length > 0 && (
        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Wrestler</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Current</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Transfer To</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map(t => (
                <tr key={t.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/wrestlers/${t.wrestlers.id}`} className="font-medium text-slate-800 hover:underline">
                      {t.wrestlers.first_name} {t.wrestlers.last_name}
                    </Link>
                    <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${
                      t.wrestlers.gender === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {t.wrestlers.gender === 'F' ? 'G' : 'B'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {t.current_school
                      ? <Link href={`/admin/schools/${t.current_school.id}`} className="hover:underline">{t.current_school.display_name}</Link>
                      : <span className="text-slate-400">Unknown</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <Link href={`/admin/schools/${t.suspected_school.id}`} className="hover:underline">
                      {t.suspected_school.display_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(t.id, 'confirm')}
                        disabled={actionLoading === t.id}
                        className="text-xs px-2.5 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleAction(t.id, 'reject')}
                        disabled={actionLoading === t.id}
                        className="text-xs px-2.5 py-1 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                      >
                        Not a Transfer
                      </button>
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
