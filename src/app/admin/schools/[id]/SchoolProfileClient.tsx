'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

// ── Types ──────────────────────────────────────────────────────────────────────

type School = Record<string, unknown>

type District = { id: number; name: string }
type Region   = { id: number; name: string }

type Meet = {
  id: string
  meet_date: string
  gender: string
  season_id: number
  status: string | null
  team1: { id: number; display_name: string } | null
  team2: { id: number; display_name: string } | null
}

type Coach = {
  id: string
  name: string
  title: string
  email: string | null
  phone: string | null
  is_active: boolean
  season_id: number | null
}

type ProgramData = {
  districtId:     number | null
  regionId:       number | null
  conference:     string | null
  section:        string | null
  classification: string | null
}

type Wrestler = { id: string; name: string; weights: number[]; gender: string }

const SEASONS = [
  { id: 2, label: '2025–26' },
  { id: 1, label: '2024–25' },
]

const COACH_TITLES = ['Head Coach', 'Assistant Coach', 'JV Coach', 'Volunteer Coach']

// ── Helpers ────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', options,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; options?: string[]
}) {
  if (options) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-0.5">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
          <option value="">— none —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-0.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white" />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-0.5">{label}</label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer border-0 p-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="#rrggbb"
          className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono bg-white" />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SchoolProfileClient({
  schoolId, school, currentSeasonId,
  meets, sections, allGroupsBySection, conferences,
  boysDistricts, girlsDistricts,
  boysRegions, girlsRegions,
  boys: initBoys, girls: initGirls,
  wrestlers,
}: {
  schoolId:         number
  school:           School
  currentSeasonId:  number
  meets:            Meet[]
  sections:         string[]
  allGroupsBySection: Record<string, string[]>
  conferences:      string[]
  boysDistricts:    District[]
  girlsDistricts:   District[]
  boysRegions:      Region[]
  girlsRegions:     Region[]
  boys:             ProgramData
  girls:            ProgramData
  wrestlers:        Wrestler[]
}) {
  const str = (v: unknown) => (v == null ? '' : String(v))
  const { gender } = useAdminGender()

  // ── Shared identity fields (same for both programs) ──────────────────────────
  const [localeSection,  setLocaleSection]  = useState(str(school.locale_section))
  const [displayName,    setDisplayName]    = useState(str(school.display_name))
  const [shortName,      setShortName]      = useState(str(school.short_name))
  const [mascot,         setMascot]         = useState(str(school.mascot))
  const [nickname,       setNickname]       = useState(str(school.nickname))
  const [colorPrimary,   setColorPrimary]   = useState(str(school.color_primary))
  const [colorSecondary, setColorSecondary] = useState(str(school.color_secondary))
  const [colorTertiary,  setColorTertiary]  = useState(str(school.color_tertiary))
  const [headerBg,       setHeaderBg]       = useState(str(school.header_background))
  const [primaryColor,   setPrimaryColor]   = useState(str(school.primary_color))
  const [secondaryColor, setSecondaryColor] = useState(str(school.secondary_color))
  const [town,           setTown]           = useState(str(school.town))
  const [county,         setCounty]         = useState(str(school.county))
  const [websiteUrl,     setWebsiteUrl]     = useState(str(school.website_url))
  const [twitterHandle,  setTwitterHandle]  = useState(str(school.twitter_handle))
  const [adName,         setAdName]         = useState(str(school.ad_name))
  const [adEmail,        setAdEmail]        = useState(str(school.ad_email))
  const [logoUrl,        setLogoUrl]        = useState(str(school.logo_url))
  const [foundedYear,    setFoundedYear]    = useState(str(school.founded_year))
  const [logoDirection,  setLogoDirection]  = useState(str(school.logo_direction))

  // ── Boys program data (section/classification not season-specific) ───────────
  const [boysSection,        setBoysSection]        = useState(initBoys.section        ?? '')
  const [boysClassification, setBoysClassification] = useState(initBoys.classification ?? '')
  const [boysDistrictId,     setBoysDistrictId]     = useState(initBoys.districtId  ? String(initBoys.districtId)  : '')
  const [boysRegionId,       setBoysRegionId]       = useState(initBoys.regionId    ? String(initBoys.regionId)    : '')
  const [boysConference,     setBoysConference]     = useState(initBoys.conference  ?? '')

  // ── Girls program data ───────────────────────────────────────────────────────
  const [girlsSection,        setGirlsSection]        = useState(initGirls.section        ?? '')
  const [girlsClassification, setGirlsClassification] = useState(initGirls.classification ?? '')
  const [girlsDistrictId,     setGirlsDistrictId]     = useState(initGirls.districtId  ? String(initGirls.districtId)  : '')
  const [girlsRegionId,       setGirlsRegionId]       = useState(initGirls.regionId    ? String(initGirls.regionId)    : '')
  const [girlsConference,     setGirlsConference]     = useState(initGirls.conference  ?? '')

  // Active gender's values (derived)
  const section        = gender === 'M' ? boysSection        : girlsSection
  const classification = gender === 'M' ? boysClassification : girlsClassification
  const districtId     = gender === 'M' ? boysDistrictId     : girlsDistrictId
  const regionId       = gender === 'M' ? boysRegionId       : girlsRegionId
  const conference     = gender === 'M' ? boysConference     : girlsConference
  const setSection        = gender === 'M' ? setBoysSection        : setGirlsSection
  const setClassification = gender === 'M' ? setBoysClassification : setGirlsClassification
  const setDistrictId     = gender === 'M' ? setBoysDistrictId     : setGirlsDistrictId
  const setRegionId       = gender === 'M' ? setBoysRegionId       : setGirlsRegionId
  const setConference     = gender === 'M' ? setBoysConference     : setGirlsConference

  const districts = gender === 'M' ? boysDistricts : girlsDistricts
  const regions   = gender === 'M' ? boysRegions   : girlsRegions

  const classificationOptions = section ? allGroupsBySection[section] ?? [] : []

  // ── Season picker ────────────────────────────────────────────────────────────
  const [editSeasonId,  setEditSeasonId]  = useState<number>(currentSeasonId)
  const [seasonLoading, setSeasonLoading] = useState(false)

  useEffect(() => {
    if (editSeasonId === currentSeasonId) return
    setSeasonLoading(true)
    fetch(`/api/admin/school-profile?schoolId=${schoolId}&seasonId=${editSeasonId}&gender=${gender}`)
      .then(r => r.json())
      .then(d => {
        setDistrictId(d.districtId ? String(d.districtId) : '')
        setRegionId(d.regionId ? String(d.regionId) : '')
        setConference(d.conference ?? '')
        // section/classification are not season-specific but refresh from profile
        if (d.section        !== undefined) setSection(d.section ?? '')
        if (d.classification !== undefined) setClassification(d.classification ?? '')
      })
      .finally(() => setSeasonLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSeasonId, gender])

  // ── Inactive-this-season toggle ──────────────────────────────────────────────
  const [isInactiveSeason, setIsInactiveSeason] = useState(false)
  const [inactiveLoading,  setInactiveLoading]  = useState(false)
  const [inactiveMsg,      setInactiveMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  const loadInactiveStatus = useCallback(() => {
    fetch(`/api/admin/school-season-status?schoolId=${schoolId}&seasonId=${editSeasonId}`)
      .then(r => r.json())
      .then(d => { if (typeof d.inactive === 'boolean') setIsInactiveSeason(d.inactive) })
      .catch(() => {})
  }, [schoolId, editSeasonId])

  useEffect(() => { loadInactiveStatus() }, [loadInactiveStatus])

  const toggleInactive = async () => {
    const action = isInactiveSeason ? 'activate' : 'deactivate'
    if (action === 'deactivate') {
      const seasonLabel = SEASONS.find(s => s.id === editSeasonId)?.label ?? `season ${editSeasonId}`
      if (!window.confirm(
        `Mark this school as inactive for ${seasonLabel}?\n\nThis removes them from all season groups (district, region, conference). The school profile is preserved.`
      )) return
    }
    setInactiveLoading(true); setInactiveMsg(null)
    try {
      const r = await fetch('/api/admin/school-season-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, seasonId: editSeasonId, action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setIsInactiveSeason(d.inactive)
      setInactiveMsg({ text: action === 'deactivate' ? 'Marked inactive — removed from all season groups' : 'Reactivated', ok: true })
      if (action === 'deactivate') { setDistrictId(''); setRegionId(''); setConference('') }
    } catch (e) {
      setInactiveMsg({ text: e instanceof Error ? e.message : 'Failed', ok: false })
    } finally { setInactiveLoading(false) }
  }

  // ── Save profile ─────────────────────────────────────────────────────────────
  const [saving,     setSaving]     = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const saveProfile = async () => {
    setSaving(true); setProfileMsg(null)
    try {
      const r = await fetch('/api/admin/school-profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId, seasonId: editSeasonId, gender,
          fields: {
            display_name: displayName, short_name: shortName, mascot, nickname,
            color_primary: colorPrimary, color_secondary: colorSecondary,
            color_tertiary: colorTertiary, header_background: headerBg,
            primary_color: primaryColor, secondary_color: secondaryColor,
            town, county, website_url: websiteUrl,
            twitter_handle: twitterHandle, logo_url: logoUrl,
            ad_name: adName || null, ad_email: adEmail || null,
            founded_year: foundedYear ? parseInt(foundedYear, 10) : null,
            logo_direction: logoDirection || null,
            locale_section: localeSection || null,
            section, classification,
          },
          districtId: districtId ? parseInt(districtId, 10) : null,
          regionId:   regionId   ? parseInt(regionId, 10)   : null,
          conference: conference || null,
        }),
      })
      const d = await r.json()
      setProfileMsg({ text: d.error ?? 'Saved', ok: !d.error })
    } finally { setSaving(false) }
  }

  // ── Coaches (loaded client-side, gender + season aware) ──────────────────────
  const [coaches,    setCoaches]    = useState<Coach[]>([])
  const [newCoach,   setNewCoach]   = useState({ name: '', title: 'Head Coach', email: '', phone: '' })
  const [coachMsg,   setCoachMsg]   = useState<{ text: string; ok: boolean } | null>(null)
  const [addingCoach, setAddingCoach] = useState(false)
  const [editingCoach, setEditingCoach] = useState<string | null>(null)
  const [editCoachDraft, setEditCoachDraft] = useState<{ name: string; title: string; email: string; phone: string }>({ name: '', title: '', email: '', phone: '' })
  const [savingCoach, setSavingCoach] = useState(false)

  const loadCoaches = useCallback(() => {
    fetch(`/api/admin/school-coaches?schoolId=${schoolId}&seasonId=${editSeasonId}&gender=${gender}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setCoaches(d.coaches ?? []) })
      .catch(() => {})
  }, [schoolId, editSeasonId, gender])

  useEffect(() => { loadCoaches() }, [loadCoaches])

  const createCoach = async () => {
    if (!newCoach.name.trim()) return
    setAddingCoach(true)
    try {
      const r = await fetch('/api/admin/school-coaches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId, name: newCoach.name, title: newCoach.title,
          coachEmail: newCoach.email, phone: newCoach.phone,
          seasonId: editSeasonId, gender,
        }),
      })
      const d = await r.json()
      if (d.error) { setCoachMsg({ text: d.error, ok: false }); return }
      setCoaches(prev => [d.coach, ...prev])
      setNewCoach({ name: '', title: 'Head Coach', email: '', phone: '' })
      setCoachMsg({ text: 'Coach added', ok: true })
    } finally { setAddingCoach(false) }
  }

  const toggleCoachActive = useCallback(async (coach: Coach) => {
    const r = await fetch('/api/admin/school-coaches', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coach.id, is_active: !coach.is_active, gender }),
    })
    if (r.ok) setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: !c.is_active } : c))
  }, [gender])

  const deleteCoach = useCallback(async (coachId: string) => {
    if (!window.confirm('Delete this coach?')) return
    const r = await fetch('/api/admin/school-coaches', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coachId, gender }),
    })
    if (r.ok) setCoaches(prev => prev.filter(c => c.id !== coachId))
  }, [gender])

  const startEditCoach = useCallback((c: Coach) => {
    setEditingCoach(c.id)
    setEditCoachDraft({ name: c.name, title: c.title, email: c.email ?? '', phone: c.phone ?? '' })
  }, [])

  const saveCoachEdit = useCallback(async () => {
    if (!editingCoach) return
    setSavingCoach(true)
    try {
      const r = await fetch('/api/admin/school-coaches', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCoach, gender,
          name:       editCoachDraft.name,
          title:      editCoachDraft.title,
          coachEmail: editCoachDraft.email,
          phone:      editCoachDraft.phone,
        }),
      })
      if (r.ok) {
        setCoaches(prev => prev.map(c => c.id === editingCoach
          ? { ...c, name: editCoachDraft.name, title: editCoachDraft.title, email: editCoachDraft.email || null, phone: editCoachDraft.phone || null }
          : c
        ))
        setEditingCoach(null)
      }
    } finally { setSavingCoach(false) }
  }, [editingCoach, editCoachDraft, gender])

  // ── Schedule ─────────────────────────────────────────────────────────────────
  const [editingMeet, setEditingMeet] = useState<string | null>(null)
  const [meetDateVal,  setMeetDateVal]  = useState('')
  const [schedMsg,     setSchedMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  const saveMeetDate = async (meetId: string) => {
    const r = await fetch('/api/admin/school-schedule', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetId, meetDate: meetDateVal }),
    })
    const d = await r.json()
    if (d.error) { setSchedMsg({ text: d.error, ok: false }); return }
    setEditingMeet(null)
    setSchedMsg({ text: 'Date updated', ok: true })
    setTimeout(() => setSchedMsg(null), 2000)
  }

  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'
  const genderMeets = meets.filter(m => m.gender === gender)

  return (
    <div className="space-y-10">

      {/* ── PROFILE FORM ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4 pb-1 border-b border-slate-200">
          Profile
          <span className="ml-2 text-xs font-normal text-slate-400">Identity fields are shared; competitive fields are {genderLabel}-specific</span>
        </h2>
        <div className="space-y-6">

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Name &amp; Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Display Name" value={displayName} onChange={setDisplayName} />
              <Field label="Short Name"   value={shortName}   onChange={setShortName} />
              <Field label="Mascot"       value={mascot}       onChange={setMascot} />
              <Field label="Nickname"     value={nickname}     onChange={setNickname} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Colors</p>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primary Color"     value={colorPrimary}   onChange={setColorPrimary} />
              <ColorField label="Secondary Color"   value={colorSecondary} onChange={setColorSecondary} />
              <ColorField label="Tertiary Color"    value={colorTertiary}  onChange={setColorTertiary} />
              <ColorField label="Header Background" value={headerBg}       onChange={setHeaderBg} />
              <ColorField label="Legacy Primary"    value={primaryColor}   onChange={setPrimaryColor} />
              <ColorField label="Legacy Secondary"  value={secondaryColor} onChange={setSecondaryColor} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Location</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Town"   value={town}   onChange={setTown} />
              <Field label="County" value={county} onChange={setCounty} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Athletic Director</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="AD Name"  value={adName}  onChange={setAdName} />
              <Field label="AD Email" value={adEmail} onChange={setAdEmail} type="email" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Links</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Website URL"      value={websiteUrl}    onChange={setWebsiteUrl} />
              <Field label="Twitter/X Handle" value={twitterHandle} onChange={setTwitterHandle} />
              <Field label="Logo URL"         value={logoUrl}       onChange={setLogoUrl} />
              <Field label="Founded Year"     value={foundedYear}   onChange={setFoundedYear} type="number" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Logo Direction</p>
            <div className="max-w-xs">
              <Field
                label="Which way does the logo naturally face?"
                value={logoDirection}
                onChange={setLogoDirection}
                options={['left', 'right']}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Away logos (left side) are flipped to face right; home logos (right side) are flipped to face left. Leave blank for forward-facing logos.
              </p>
            </div>
          </div>

          {/* ── PROGRAM-SPECIFIC: section + classification ── */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              {genderLabel} Classification
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section" value={section} onChange={v => { setSection(v); setClassification('') }} options={sections} />
              <Field label="Group"   value={classification} onChange={setClassification} options={classificationOptions} />
            </div>
            {section === 'Non-Public' && (
              <div className="mt-3">
                <Field
                  label="Locale Section (for Snapshot dashboard)"
                  value={localeSection}
                  onChange={setLocaleSection}
                  options={['North I', 'North II', 'Central', 'South']}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Where this Non-Public school is geographically located. Used to place it in the correct section tab on the daily Snapshot dashboard.
                </p>
              </div>
            )}
          </div>

          {/* ── PROGRAM-SPECIFIC: district / region / conference (season-scoped) ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {genderLabel} Groups &amp; Conference
              </p>
              <div className="flex items-center gap-2">
                {seasonLoading && <span className="text-xs text-slate-400">Loading…</span>}
                <span className="text-xs text-slate-500">Season:</span>
                {SEASONS.map(s => (
                  <button key={s.id} onClick={() => setEditSeasonId(s.id)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      editSeasonId === s.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inactive toggle */}
            <div className={`flex items-center justify-between px-3 py-2 mb-3 rounded border ${isInactiveSeason ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                {isInactiveSeason && (
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                    Inactive this season
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {isInactiveSeason
                    ? `No ${genderLabel} program this season — excluded from groups and matcher`
                    : `${genderLabel} program is active this season`}
                </span>
              </div>
              <button onClick={toggleInactive} disabled={inactiveLoading}
                className={`text-xs px-2.5 py-1 rounded border font-medium disabled:opacity-40 transition-colors ${
                  isInactiveSeason
                    ? 'border-green-400 bg-white text-green-700 hover:bg-green-50'
                    : 'border-amber-400 bg-white text-amber-700 hover:bg-amber-50'
                }`}>
                {inactiveLoading ? '…' : isInactiveSeason ? 'Reactivate' : 'Mark inactive this season'}
              </button>
            </div>
            {inactiveMsg && (
              <p className={`text-xs mb-2 ${inactiveMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{inactiveMsg.text}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">District</label>
                <select value={districtId} onChange={e => setDistrictId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
                  <option value="">— none —</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Region</label>
                <select value={regionId} onChange={e => setRegionId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
                  <option value="">— none —</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <Field label="Athletic Conference" value={conference} onChange={setConference} options={conferences} />
            </div>
          </div>

        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={saveProfile} disabled={saving}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {profileMsg && (
            <span className={`text-sm font-medium ${profileMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {profileMsg.text}
            </span>
          )}
        </div>
      </section>

      {/* ── COACHES ───────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4 pb-1 border-b border-slate-200">
          {genderLabel} Coaches
          <span className="ml-2 text-xs font-normal text-slate-400">
            {SEASONS.find(s => s.id === editSeasonId)?.label ?? ''}
          </span>
        </h2>

        {/* Add coach */}
        <div className="border border-slate-200 rounded p-3 mb-4 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Add Coach</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <input placeholder="Name" value={newCoach.name}
              onChange={e => setNewCoach(p => ({ ...p, name: e.target.value }))}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white col-span-1" />
            <select value={newCoach.title}
              onChange={e => setNewCoach(p => ({ ...p, title: e.target.value }))}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
              {COACH_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Email" value={newCoach.email}
              onChange={e => setNewCoach(p => ({ ...p, email: e.target.value }))}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white" />
            <input placeholder="Phone" value={newCoach.phone}
              onChange={e => setNewCoach(p => ({ ...p, phone: e.target.value }))}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createCoach} disabled={addingCoach || !newCoach.name.trim()}
              className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded disabled:opacity-40">
              Add
            </button>
            {coachMsg && <span className={`text-sm ${coachMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{coachMsg.text}</span>}
          </div>
        </div>

        {coaches.length === 0 ? (
          <p className="text-sm text-slate-400">No {genderLabel.toLowerCase()} coaches on file.</p>
        ) : (
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coaches.map(c => {
                const isEditing = editingCoach === c.id
                const inp = 'border border-slate-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-400'
                return (
                  <tr key={c.id} className={c.is_active ? '' : 'opacity-50'}>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <input value={editCoachDraft.name} onChange={e => setEditCoachDraft(p => ({ ...p, name: e.target.value }))} className={inp} />
                        : <span className="font-medium">{c.name}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <select value={editCoachDraft.title} onChange={e => setEditCoachDraft(p => ({ ...p, title: e.target.value }))} className={inp}>
                            {COACH_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        : <span className="text-slate-600">{c.title}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <input type="email" value={editCoachDraft.email} onChange={e => setEditCoachDraft(p => ({ ...p, email: e.target.value }))} placeholder="Email" className={inp} />
                        : <span className={c.email ? 'text-slate-700' : 'text-slate-400'}>{c.email ?? '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <input value={editCoachDraft.phone} onChange={e => setEditCoachDraft(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className={inp} />
                        : <span className="text-slate-500">{c.phone ?? '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => toggleCoachActive(c)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={saveCoachEdit} disabled={savingCoach}
                              className="text-xs text-green-700 font-semibold hover:text-green-900 disabled:opacity-50">
                              {savingCoach ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingCoach(null)}
                              className="text-xs text-slate-400 hover:text-slate-600">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditCoach(c)} className="text-xs text-blue-600 hover:text-blue-800">
                              Edit
                            </button>
                            <button onClick={() => deleteCoach(c.id)} className="text-xs text-red-500 hover:text-red-700">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── SCHEDULE ─────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 pb-1 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">{genderLabel} Schedule</h2>
          {schedMsg && <span className={`text-sm font-medium ${schedMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{schedMsg.text}</span>}
        </div>

        {genderMeets.length === 0 ? (
          <p className="text-sm text-slate-400">No {genderLabel.toLowerCase()} dual meets on file.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Opponent</th>
                  <th className="px-3 py-2 text-left">Season</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {genderMeets.map(m => {
                  const isTeam1  = m.team1?.id === schoolId
                  const opponent = isTeam1 ? m.team2 : m.team1
                  const isEditing = editingMeet === m.id
                  return (
                    <tr key={m.id}>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex gap-1.5 items-center">
                            <input type="date" value={meetDateVal} onChange={e => setMeetDateVal(e.target.value)}
                              className="border border-blue-400 rounded px-1.5 py-0.5 text-xs bg-white" />
                            <button onClick={() => saveMeetDate(m.id)} className="text-xs text-blue-600 font-medium">Save</button>
                            <button onClick={() => setEditingMeet(null)} className="text-xs text-slate-400">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingMeet(m.id); setMeetDateVal(m.meet_date ?? '') }}
                            className="text-slate-700 hover:text-blue-600 hover:underline text-left">
                            {m.meet_date ?? '—'}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {opponent ? (
                          <Link href={`/admin/schools/${opponent.id}`} className="text-blue-600 hover:underline">
                            {opponent.display_name}
                          </Link>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{m.season_id}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{m.status ?? 'active'}</td>
                      <td className="px-3 py-2">
                        <Link href={`/meets/${m.id}`} target="_blank" className="text-xs text-slate-400 hover:text-slate-600">↗</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── ROSTER ───────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4 pb-1 border-b border-slate-200">
          Roster <span className="text-slate-400 font-normal text-sm">(from tournament entries, all seasons)</span>
        </h2>
        {wrestlers.length === 0 ? (
          <p className="text-sm text-slate-400">No wrestlers on file.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(['M', 'F'] as const).map(g => {
              const group = wrestlers.filter(w => w.gender === g)
              if (group.length === 0) return null
              return (
                <div key={g} className="border border-slate-200 rounded">
                  <p className="px-3 py-1.5 bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
                    {g === 'M' ? 'Boys' : 'Girls'} ({group.length})
                  </p>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {group.map(w => (
                      <Link key={w.id} href={`/wrestler/${w.id}`} target="_blank"
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 text-sm">
                        <span className="text-slate-800">{w.name}</span>
                        <span className="text-xs text-slate-400">{w.weights.sort((a, b) => a - b).join(', ')}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
