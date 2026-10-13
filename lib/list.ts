/**
 * Normalises the paginated list shapes the admin API returns
 * ({ data:[…], meta } · { data:{ data:[…] } } · plain array) into one structure.
 */
export interface ListResult<T = any> {
  rows: T[];
  total: number;
  currentPage: number;
  lastPage: number;
  perPage: number;
  from: number;
  to: number;
  raw: any;
}

export function normalizeList<T = any>(payload: any, page = 1, limit = 20): ListResult<T> {
  const raw = payload ?? {};
  const rows: T[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.data?.data)
        ? raw.data.data
        : Array.isArray(raw?.items)
          ? raw.items
          : [];
  const meta = raw?.meta ?? raw?.data?.meta ?? raw?.pagination ?? {};
  const total = Number(meta.total ?? rows.length) || 0;
  const perPage = Number(meta.per_page ?? meta.limit ?? limit) || limit;
  const currentPage = Number(meta.current_page ?? meta.page ?? page) || page;
  const lastPage = Math.max(1, Number(meta.last_page ?? meta.total_pages ?? Math.ceil(total / perPage)) || 1);
  const from = total === 0 ? 0 : Number(meta.from ?? (currentPage - 1) * perPage + 1);
  const to = total === 0 ? 0 : Number(meta.to ?? Math.min(from + rows.length - 1, total));
  return { rows, total, currentPage, lastPage, perPage, from, to, raw };
}
