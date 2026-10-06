/** PostgREST returns at most 1000 rows unless the query asks for the next page. */
const PAGE = 1000;

export async function fetchAllRows<T>(
  loadPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: null } | { data: null; error: { message: string } }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await loadPage(from, from + PAGE - 1);
    if (error) return { data: null, error };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) return { data: rows, error: null };
  }
}
