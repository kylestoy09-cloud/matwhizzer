import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serviceClient, FK_DISPLAY } from '../_auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const table  = req.nextUrl.searchParams.get('table')  ?? ''
  const search = req.nextUrl.searchParams.get('search') ?? ''

  if (!table) return NextResponse.json({ error: 'Missing table' }, { status: 400 })

  const config = FK_DISPLAY[table]
  if (!config) {
    // Unknown FK target — return empty so client shows raw ID
    return NextResponse.json({ options: [] })
  }

  const db = serviceClient()
  let query = db.from(table).select(config.cols).limit(200).order('id', { ascending: true })

  if (search) {
    const labelCol = config.cols.split(',')[1] // first non-id col
    if (labelCol) query = query.ilike(labelCol, `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const options = rows.map(r => ({
    id:    r['id'],
    label: config.label(r),
  }))

  return NextResponse.json({ options })
}
