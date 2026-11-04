// Boys roster grade import: mark a school's review complete (POST), or reopen it (DELETE).
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { setComplete } from '@/lib/rosterGradeComplete'

export const dynamic = 'force-dynamic'

async function handle(req: NextRequest, complete: boolean) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return setComplete(req, 'M', complete, user.email ?? null)
}

export async function POST(req: NextRequest) { return handle(req, true) }
export async function DELETE(req: NextRequest) { return handle(req, false) }
