export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default async function WrestlerRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await supabase
    .from('wrestlers')
    .select('gender')
    .eq('id', id)
    .single()
  const prefix = data?.gender === 'F' ? 'girls' : 'boys'
  redirect(`/${prefix}/wrestler/${id}`)
}
