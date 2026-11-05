import { deletePreview } from '../../src/lib/wrestlerDelete'
import { createSupabaseAdmin } from '../../src/lib/supabase/service'
const db = createSupabaseAdmin()
console.log(JSON.stringify(await deletePreview(db, '84a51f26-499a-47b9-8cad-3e90552b6179')))
const { data } = await db.from('wrestlers').select('id').eq('gender', 'M').limit(1)
console.log(JSON.stringify(await deletePreview(db, data![0].id)))
