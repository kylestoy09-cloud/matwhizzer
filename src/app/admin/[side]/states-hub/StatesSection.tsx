import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HubShell } from '../dashboards/HubShell'


function StatesHeader({ label }: { label: string }) {
  function Pill({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="flex flex-col gap-1.5 px-4 py-3 border border-slate-100 rounded-lg bg-slate-50 min-w-[110px]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-bold tabular-nums leading-none text-slate-800">{value}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">States — {label}</p>
        <p className="text-sm text-slate-500 font-medium">State Championship</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Divisions" value="—" />
        <Pill label="Brackets"  value="—" />
      </div>
    </div>
  )
}

export async function StatesSection({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <HubShell header={<StatesHeader label={side === 'girls' ? 'Girls' : 'Boys'} />}>
      <div className="p-8 flex flex-col items-center justify-center h-64 gap-3 text-center">
        <p className="text-lg font-semibold text-slate-500">State Championship</p>
        <p className="text-sm text-slate-400 max-w-sm">
          Load bracket → load results → close out will appear here (bracket intake, in progress).
        </p>
      </div>
    </HubShell>
  )
}
