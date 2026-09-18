// Shared task-finding logic for the microcheck tool.
// Priority order defines the exact sequence tasks are doled out.

export type InputType = 'text' | 'url' | 'email' | 'roster'

export type SchoolProfileTask = {
  task_type:   'school_profile'
  school_id:   number
  school_name: string
  gender:      'M' | 'F'
  field:       string
  label:       string
  input_type:  InputType
  placeholder: string
}

export type TieResolutionTask = {
  task_type:       'tie_resolution'
  task_id:         string
  entity_id:       string
  gender:          'M' | 'F'
  team1_school_id: number
  team2_school_id: number
  team1_name:      string
  team2_name:      string
  score:           number
  meet_date:       string
  season_id:       number
  dual_table:      string
}

export type TaskInfo = SchoolProfileTask | TieResolutionTask

type School = {
  id:             number
  display_name:   string
  address:        string | null
  website_url:    string | null
  twitter_handle: string | null
  facebook_url:   string | null
  ad_name:        string | null
  ad_email:       string | null
}

const BOYS_PRIORITY: { field: string; label: string; input_type: InputType; placeholder: string }[] = [
  // Grade confirmations first — all must be addressed before school profile data
  { field: 'roster_match',   label: 'wrestler roster match',   input_type: 'roster', placeholder: '' },
  // School profile / contact data second
  { field: 'address',        label: 'address',                 input_type: 'text',   placeholder: '123 Main St, Collingswood, NJ 08107' },
  { field: 'website_url',    label: 'website URL',             input_type: 'url',    placeholder: 'https://collegathletics.com' },
  { field: 'twitter_handle', label: 'Twitter / X handle',      input_type: 'text',   placeholder: '@CollingswoodWrestling' },
  { field: 'facebook_url',   label: 'Facebook page URL',       input_type: 'url',    placeholder: 'https://facebook.com/...' },
  { field: 'coach_name',     label: 'head coach name',         input_type: 'text',   placeholder: 'John Smith' },
  { field: 'coach_email',    label: 'head coach email',        input_type: 'email',  placeholder: 'jsmith@district.k12.nj.us' },
  { field: 'ad_name',        label: 'athletic director name',  input_type: 'text',   placeholder: 'Jane Doe' },
  { field: 'ad_email',       label: 'athletic director email', input_type: 'email',  placeholder: 'jdoe@district.k12.nj.us' },
]

export function findNextTask(
  schools:    School[],
  loggedSet:  Set<string>,           // `${school_id}_${field}` for all completed/cant_find
  coachMap:   Map<number, { email: string | null }>,   // school_id → coach row
  rosterSet:  Set<number>,           // school_ids with unmatched roster entries
  flaggedSet: Set<number>,           // school_ids flagged for manual roster review (skip roster_match)
  gender:     'M' | 'F' = 'M',
): SchoolProfileTask | null {
  const priority = gender === 'M' ? BOYS_PRIORITY : BOYS_PRIORITY  // girls same order for now

  // Field-first: complete roster_match for all schools A→Z, then address for all schools A→Z, etc.
  for (const { field, label, input_type, placeholder } of priority) {
    for (const school of schools) {
      const key = `${school.id}_${field}`
      if (loggedSet.has(key)) continue

      let needsTask = false
      if      (field === 'address')        needsTask = !school.address?.trim()
      else if (field === 'website_url')    needsTask = !school.website_url?.trim()
      else if (field === 'twitter_handle') needsTask = !school.twitter_handle?.trim()
      else if (field === 'facebook_url')   needsTask = !school.facebook_url?.trim()
      else if (field === 'ad_name')        needsTask = !school.ad_name?.trim()
      else if (field === 'ad_email')       needsTask = !school.ad_email?.trim()
      else if (field === 'coach_name')     needsTask = !coachMap.has(school.id)
      else if (field === 'coach_email')    needsTask = coachMap.has(school.id) && !coachMap.get(school.id)!.email?.trim()
      else if (field === 'roster_match')   needsTask = rosterSet.has(school.id) && !flaggedSet.has(school.id)

      if (needsTask) {
        return { task_type: 'school_profile', school_id: school.id, school_name: school.display_name, gender, field, label, input_type, placeholder }
      }
    }
  }
  return null
}
