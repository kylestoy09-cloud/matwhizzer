import { NextRequest } from 'next/server'
import { PUBLIC_DATA_REVALIDATE, PUBLIC_DATA_TAG } from '@/lib/supabase/public-cached'

// Read-only pass-through to Supabase for public client components (2026-11-11: keep
// school-page tab clicks off the database). The browser client in
// src/lib/supabase/browser-cached.ts sends its table and RPC reads here; each distinct
// read (URL, headers and RPC body) is answered from the Next data cache for
// PUBLIC_DATA_REVALIDATE seconds, the same freshness as the server-rendered pages.
// Reads run with the anon key only, so this returns nothing the browser couldn't
// already read itself. Writes are refused.

export const dynamic = 'force-dynamic'

const REST = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const NAME = /^[a-z_][a-z0-9_]*$/
const PASS_HEADERS = ['accept', 'prefer', 'range', 'range-unit', 'accept-profile', 'content-profile', 'content-type']
const PASS_BACK = ['content-type', 'content-range']

async function forward(req: NextRequest, path: string[], method: 'GET' | 'HEAD' | 'POST') {
  // a table read (one name) or an RPC (rpc/<name>, POST only)
  const isRpc = path.length === 2 && path[0] === 'rpc' && NAME.test(path[1])
  const isTable = path.length === 1 && NAME.test(path[0])
  if (method === 'POST' ? !isRpc : !isTable) return new Response('Not allowed', { status: 405 })

  const headers: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}` }
  for (const h of PASS_HEADERS) { const v = req.headers.get(h); if (v) headers[h] = v }
  const res = await fetch(REST + path.join('/') + req.nextUrl.search, {
    method,
    headers,
    body: method === 'POST' ? await req.text() : undefined,
    cache: 'force-cache',
    next: { revalidate: PUBLIC_DATA_REVALIDATE, tags: [PUBLIC_DATA_TAG] },
  })
  const out = new Headers()
  for (const h of PASS_BACK) { const v = res.headers.get(h); if (v) out.set(h, v) }
  return new Response(method === 'HEAD' ? null : await res.text(), { status: res.status, headers: out })
}

type Ctx = { params: Promise<{ path: string[] }> }
export async function GET(req: NextRequest, { params }: Ctx) { return forward(req, (await params).path, 'GET') }
export async function HEAD(req: NextRequest, { params }: Ctx) { return forward(req, (await params).path, 'HEAD') }
export async function POST(req: NextRequest, { params }: Ctx) { return forward(req, (await params).path, 'POST') }
