// Test stand-in for the signed-in admin session (local scripts only)
export async function createSupabaseServer() {
  const q = { select: () => q, eq: () => q, single: async () => ({ data: { role: 'admin' }, error: null }), maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }
  return { auth: { getUser: async () => ({ data: { user: { id: 'local', email: 'local' } } }) }, from: () => q }
}
