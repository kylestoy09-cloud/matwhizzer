import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('wrestlers').select('id, first_name, grade, grade_confirmed_source, grade_confirmed_at').in('id', ['63f2f295-c752-4317-8f52-4456328bd1db', 'af9d4501-4668-4626-9cc4-427ce1d86a84', '59b0f8c5-1ad9-4390-ab3e-e720b3130a63', '6da4fa41-1ad3-4668-8c80-ef7fbe207ad3'])).data))
console.log(JSON.stringify((await db.from('roster_grade_import').select('id, first_name_raw, last_name_raw, grade, status, wrestler_id').in('wrestler_id', ['63f2f295-c752-4317-8f52-4456328bd1db', 'f8ed474f-46d5-4eb4-b7a3-a31919cbaaf7', '104693f0-ac0e-4396-88b3-cb80525358ad'])).data))
