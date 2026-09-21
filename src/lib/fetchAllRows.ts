// Supabase (PostgREST) returns at most 1,000 rows per request on this project,
// whatever .limit() or .range() asks for. fetchAllRows pages through with
// .range() until a short page comes back.
//
// `page` builds the query for one page and must apply a deterministic .order()
// ending on a unique column (usually 'id'), or rows can repeat or go missing
// between pages. Returns the same { data, error } shape as a single query.

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PageResult<T>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}
