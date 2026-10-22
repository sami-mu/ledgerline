import type { InvoiceListParams } from "@/lib/api/client";

/** List page state, as stored in the URL. */
export type ListState = Required<Omit<InvoiceListParams, "page_size">>;
export type ListFilter = ListState["status"];
export type SortKey = ListState["sort"];

export const PAGE_SIZE = 20;

export const DEFAULT_STATE: ListState = {
  q: "",
  status: "all",
  sort: "issue_date",
  direction: "desc",
  page: 1,
};

const STATUSES: readonly ListFilter[] = ["all", "draft", "outstanding", "overdue", "paid"];
const SORTS: readonly SortKey[] = [
  "number",
  "customer",
  "issue_date",
  "due_date",
  "status",
  "total",
  "updated_at",
];

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Unknown or malformed values fall back to the defaults. */
export function parseListState(params: URLSearchParams): ListState {
  const page = Number(params.get("page"));
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    status: oneOf(params.get("status"), STATUSES, DEFAULT_STATE.status),
    sort: oneOf(params.get("sort"), SORTS, DEFAULT_STATE.sort),
    direction: oneOf(params.get("dir"), ["asc", "desc"] as const, DEFAULT_STATE.direction),
    page: Number.isInteger(page) && page > 0 ? page : DEFAULT_STATE.page,
  };
}

/** Only non-default values, so URLs stay short. */
export function toSearchParams(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.status !== DEFAULT_STATE.status) params.set("status", state.status);
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_STATE.direction) params.set("dir", state.direction);
  if (state.page !== DEFAULT_STATE.page) params.set("page", String(state.page));
  return params;
}

export function toApiParams(state: ListState): InvoiceListParams {
  return { ...state, q: state.q.trim(), page_size: PAGE_SIZE };
}

export function nextSort(state: ListState, key: SortKey): Pick<ListState, "sort" | "direction"> {
  if (state.sort === key)
    return { sort: key, direction: state.direction === "asc" ? "desc" : "asc" };
  return { sort: key, direction: key === "customer" || key === "number" ? "asc" : "desc" };
}

/** Page buttons around the current page; null marks a gap. */
export function pageRange(current: number, total: number, window = 1): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total]);
  for (let p = current - window; p <= current + window; p++) {
    if (p > 1 && p < total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((page, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && page - previous > 1) {
      // A gap of exactly one page shows that page instead of an ellipsis.
      result.push(page - previous === 2 ? page - 1 : null);
    }
    result.push(page);
  });
  return result;
}
