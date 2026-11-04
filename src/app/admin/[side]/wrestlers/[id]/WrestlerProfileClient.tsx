'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type School = { id: number; display_name: string }

type Wrestler = {
  id:                     string
  first_name:             string
  last_name:              string
  gender:                 string
  main_weight:            string | null
  is_oos:                 boolean
  // enrollment columns (null when migration pending)
  grade?:                  string | null
  grade_confirmed_at?:     string | null
  grade_confirmed_source?: string | null
  projected_weight_class?: number | null
  confirmed_weight_class?: number | null
  is_active?:              boolean
}

type HistoryRow = {
  id:                    string
  school_id:             number
  start_date:            string
  end_date:              string | null
  is_confirmed_transfer: boolean
  created_via:           string
  schools:               School
}

type Props = {
  wrestler:       Wrestler
  currentSchool:  School | null
  schoolHistory:  HistoryRow[]
  enrollmentReady: boolean
  allSchools:     School[]
}

const GRADE_OPTIONS = ['Fr', 'So', 'Jr', 'Sr']
const WEIGHT_OPTIONS = [100, 106, 107, 113, 114, 120, 126, 132, 138, 144, 150, 152, 157, 165, 175, 185, 190, 215, 235, 285]

export function WrestlerProfileClient({ wrestler, currentSchool, schoolHistory, enrollmentReady, allSchools }: Props) {
  const [firstName,    setFirstName]    = useState(wrestler.first_name)
  const [lastName,     setLastName]     = useState(wrestler.last_name)
  const [mainWeight,   setMainWeight]   = useState(wrestler.main_weight ?? '')
  const [grade,        setGrade]        = useState(wrestler.grade ?? '')
  const [projWeight,   setProjWeight]   = useState(wrestler.projected_weight_class?.toString() ?? '')
  const [confWeight,   setConfWeight]   = useState(wrestler.confirmed_weight_class?.toString() ?? '')
  const [isActive,     setIsActive]     = useState(wrestler.is_active ?? true)
  const [schoolId,     setSchoolId]     = useState(currentSchool?.id?.toString() ?? '')
  const [saving,       setSaving]       = useState(false)
  const [flash,        setFlash]        = useState<string | null>(null)
  const [flashType,    setFlashType]    = useState<'ok' | 'err'>('ok')

  const showFlash = (msg: string, type: 'ok' | 'err') => {
    setFlash(msg); setFlashType(type)
    setTimeout(() => setFlash(null), 3500)
  }

  const originalSchoolId = currentSchool?.id?.toString() ?? ''

  async function save() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        id:          wrestler.id,
        first_name:  firstName.trim(),
        last_name:   lastName.trim(),
        main_weight: mainWeight || null,
      }
      if (enrollmentReady) {
        body.grade                   = grade || null
        body.projected_weight_class  = projWeight  ? parseInt(projWeight)  : null
        body.confirmed_weight_class  = confWeight  ? parseInt(confWeight)  : null
        body.is_active               = isActive
        if (schoolId && schoolId !== originalSchoolId) {
          body.school_id = parseInt(schoolId)
        }
      }

      const res = await fetch('/api/admin/wrestler-profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const d = await res.json()
      if (d.error) { showFlash(d.error, 'err') }
      else { showFlash('Saved', 'ok') }
    } catch (e) {
      showFlash(String(e), 'err')
    } finally {
      setSaving(false)
    }
  }

  const schoolChanged = enrollmentReady && schoolId && schoolId !== originalSchoolId

  return (
    <div className="space-y-6">
      {flash && (
        <div className={`text-sm px-4 py-2 rounded border ${
          flashType === 'ok'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>{flash}</div>
      )}

      {/* Basic profile */}
      <section className="border border-slate-200 rounded overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Identity</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">First Name</span>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Last Name</span>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Main Weight</span>
            <select
              value={mainWeight}
              onChange={e => setMainWeight(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">— None —</option>
              {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* Enrollment (migration-gated) */}
      {enrollmentReady ? (
        <section className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Enrollment</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Grade</span>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— Unknown —</option>
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {wrestler.grade_confirmed_at && (
                <p className="text-xs text-slate-400 mt-1">
                  Last confirmed: {new Date(wrestler.grade_confirmed_at).toLocaleDateString()} via {wrestler.grade_confirmed_source}
                </p>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Active</span>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">{isActive ? 'Active' : 'Inactive (graduated or transferred out)'}</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Projected Weight Class</span>
              <select
                value={projWeight}
                onChange={e => setProjWeight(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— Unknown —</option>
                {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Confirmed Weight Class</span>
              <select
                value={confWeight}
                onChange={e => setConfWeight(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— Not confirmed —</option>
                {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
        </section>
      ) : (
        <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3 text-sm text-amber-800">
          Apply <code className="font-mono text-xs">docs/migrations/20260824_roster_enrollment.sql</code> to enable
          grade, weight, and active status editing.
        </div>
      )}

      {/* School / Transfer */}
      <section className="border border-slate-200 rounded overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">School</h2>
        </div>
        <div className="px-5 py-4">
          {enrollmentReady ? (
            <>
              <label className="block mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Current School</span>
                <select
                  value={schoolId}
                  onChange={e => setSchoolId(e.target.value)}
                  className="w-full max-w-md border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">— Unknown —</option>
                  {allSchools.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </label>
              {schoolChanged && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3 max-w-md">
                  Changing the school will close the current school history record and create a new one (confirmed transfer).
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 mb-3">
              Current school: <strong>{currentSchool?.display_name ?? 'Unknown'}</strong>
              <span className="text-slate-400 ml-2 text-xs">(school editing requires roster_enrollment migration)</span>
            </p>
          )}

          {/* History */}
          {schoolHistory.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">School History</p>
              <div className="border border-slate-200 rounded overflow-hidden max-w-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">School</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Start</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">End</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Transfer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schoolHistory.map(row => (
                      <tr key={row.id}>
                        <td className="px-3 py-1.5 text-slate-700">
                          <Link href={`/admin/schools/${row.school_id}`} className="hover:underline">
                            {row.schools?.display_name ?? `School #${row.school_id}`}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5 text-slate-500">{row.start_date}</td>
                        <td className="px-3 py-1.5 text-slate-400">{row.end_date ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          {row.is_confirmed_transfer
                            ? <span className="text-amber-600">✓ Transfer</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-slate-900 text-white text-sm rounded font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <Link href="/admin/wrestlers" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to Wrestlers
        </Link>
      </div>

      <DeleteProfile wrestler={wrestler} />
    </div>
  )
}

// ── Delete profile ────────────────────────────────────────────────────────────
// Shows what the delete would touch first. A profile with real records (bouts, entries,
// placements, rankings) can't be deleted here: merge it instead. Confirm by typing the name.

type DeletePreview = { records: { label: string; count: number }[]; cleanup: { label: string; count: number }[]; blocked: boolean }

function DeleteProfile({ wrestler }: { wrestler: Wrestler }) {
  const router = useRouter()
  const name = `${wrestler.first_name ?? ''} ${wrestler.last_name ?? ''}`.replace(/\s+/g, ' ').trim()
  const [preview, setPreview]   = useState<DeletePreview | null>(null)
  const [loading, setLoading]   = useState(false)
  const [typed, setTyped]       = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function start() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/wrestler-profile/delete?id=${wrestler.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete() {
    setDeleting(true); setError(null)
    try {
      const res = await fetch('/api/admin/wrestler-profile/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wrestler.id, confirm: typed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin/wrestlers')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setDeleting(false)
    }
  }

  const matches = typed.replace(/\s+/g, ' ').trim().toLowerCase() === name.toLowerCase()

  return (
    <section className="mt-12 border border-red-300 rounded p-5 max-w-xl">
      <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-1">Delete Profile</h2>
      <p className="text-sm text-slate-600 mb-4">Removes this wrestler from the site. This can’t be undone here.</p>

      {!preview ? (
        <button
          onClick={start}
          disabled={loading}
          className="px-4 py-2 border border-red-600 text-red-700 text-sm rounded font-medium hover:bg-red-50 disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Delete this profile…'}
        </button>
      ) : preview.blocked ? (
        <div className="text-sm">
          <p className="text-red-700 font-medium mb-2">This profile can’t be deleted: it still has real records.</p>
          <ul className="list-disc ml-5 text-slate-700 mb-3">
            {preview.records.map(r => <li key={r.label}>{r.count} {r.label.toLowerCase()}</li>)}
          </ul>
          <p className="text-slate-500 mb-3">If it’s a duplicate, merge it into the right profile instead so those records aren’t lost.</p>
          <button onClick={() => setPreview(null)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
        </div>
      ) : (
        <div className="text-sm">
          <p className="font-medium text-slate-800 mb-2">Are you sure? This will delete <strong>{name}</strong>{preview.cleanup.length > 0 ? ' and remove:' : '.'}</p>
          {preview.cleanup.length > 0 && (
            <ul className="list-disc ml-5 text-slate-700 mb-3">
              {preview.cleanup.map(r => <li key={r.label}>{r.count} {r.label.toLowerCase()}</li>)}
            </ul>
          )}
          <label className="block text-slate-600 mb-1">Type <strong>{name}</strong> to confirm:</label>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            className="w-full max-w-sm border border-slate-300 rounded px-3 py-1.5 mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
            autoComplete="off"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={confirmDelete}
              disabled={!matches || deleting}
              className="px-4 py-2 bg-red-700 text-white text-sm rounded font-medium hover:bg-red-800 disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Yes, delete this profile'}
            </button>
            <button onClick={() => { setPreview(null); setTyped('') }} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}
