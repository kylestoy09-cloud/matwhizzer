// The built-in practice files for the Aesthetic Tool's Import review tab (2026-11-26): the 2024 NJSIAA State
// Championships as FloWrestling printed it (PDF) and exported it (CSV), and the practice results file with mistakes
// written into it (scripts/bracket_intake/make_practice_csv.mts). Admin only; read-only.
//   GET ?f=pdf | ?f=csv | ?f=practice
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getAdminUser } from '@/lib/auth/isAdminUser'

export const dynamic = 'force-dynamic'

const FILES = {
  pdf: { name: '2024_state_flo.pdf', type: 'application/pdf' },
  csv: { name: '2024_state_flo.csv', type: 'text/csv; charset=utf-8' },
  practice: { name: '2024_state_flo_practice.csv', type: 'text/csv; charset=utf-8' },
} as const

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const f = FILES[req.nextUrl.searchParams.get('f') as keyof typeof FILES]
  if (!f) return NextResponse.json({ error: 'f must be pdf, csv or practice' }, { status: 400 })
  const bytes = await readFile(path.join(process.cwd(), 'data', 'bracket_intake', f.name))
  return new NextResponse(new Uint8Array(bytes), { headers: { 'content-type': f.type, 'cache-control': 'private, max-age=3600' } })
}
