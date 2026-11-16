/** Read every page so database row limits cannot silently truncate analytics. */
export async function loadAllJourneyRows<T>(
  readPage: (from: number, to: number) => PromiseLike<{data: T[] | null; error: {message: string} | null}>,
) {
  const rows: T[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const result = await readPage(offset, offset + pageSize - 1);
    if (result.error) return {data: null, error: result.error};
    const page = result.data || [];
    rows.push(...page);
    if (page.length < pageSize) return {data: rows, error: null};
  }
}
