// Microcheck task shapes and the school fields a task can ask for. Which task comes
// next is decided by _next.ts from the order set on the Task Order page.

export type InputType = 'text' | 'url' | 'email' | 'roster'

export type SchoolProfileTask = {
  task_type:   'school_profile'
  task_key:    string          // microcheck_task_types.key
  group_label: string          // Boys / Girls / Both programs
  school_id:   number
  school_name: string
  gender:      'M' | 'F'       // shared data: the program it is logged under
  field:       string
  label:       string
  input_type:  InputType
  placeholder: string
}

export type TieResolutionTask = {
  task_type:       'tie_resolution'
  task_key:        string
  group_label:     string
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

/** The school fields microcheck can ask for: wording shown to the person and the input to use. */
export const FIELD_DEFS: Record<string, { label: string; input_type: InputType; placeholder: string }> = {
  roster_match:   { label: 'wrestler roster match',   input_type: 'roster', placeholder: '' },
  address:        { label: 'address',                 input_type: 'text',   placeholder: '123 Main St, Collingswood, NJ 08107' },
  website_url:    { label: 'website URL',             input_type: 'url',    placeholder: 'https://collegathletics.com' },
  twitter_handle: { label: 'Twitter / X handle',      input_type: 'text',   placeholder: '@CollingswoodWrestling' },
  facebook_url:   { label: 'Facebook page URL',       input_type: 'url',    placeholder: 'https://facebook.com/...' },
  coach_name:     { label: 'head coach name',         input_type: 'text',   placeholder: 'John Smith' },
  coach_email:    { label: 'head coach email',        input_type: 'email',  placeholder: 'jsmith@district.k12.nj.us' },
  ad_name:        { label: 'athletic director name',  input_type: 'text',   placeholder: 'Jane Doe' },
  ad_email:       { label: 'athletic director email', input_type: 'email',  placeholder: 'jdoe@district.k12.nj.us' },
}
