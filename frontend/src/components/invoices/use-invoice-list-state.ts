import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { isoDate } from "@/components/invoice/form-mapping";
import { useInvoiceList, useInvoiceStats } from "@/hooks/api/use-invoices";
import {
  DEFAULT_STATE,
  parseListState,
  toApiParams,
  toSearchParams,
  type ListState,
} from "./list-params";

/** List page state from the URL, plus the server data it selects. */
export function useInvoiceListState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = parseListState(searchParams);
  const list = useInvoiceList(toApiParams(state));
  const stats = useInvoiceStats();
  const [localToday] = useState(() => isoDate(new Date()));
  // The server's date decides what is overdue, so prefer it once stats have loaded.
  const today = stats.data?.as_of ?? localToday;

  const update = (next: Partial<ListState>, options?: { replace?: boolean }) => {
    // Changing anything but the page goes back to page 1.
    setSearchParams(toSearchParams({ ...state, page: 1, ...next }), { replace: options?.replace });
  };
  const reset = () => setSearchParams(toSearchParams(DEFAULT_STATE));

  // A page past the end (after deleting the last invoice on it) moves to the last real page.
  const data = list.data;
  useEffect(() => {
    if (data && !list.isPlaceholderData && data.total > 0 && state.page > data.pages) {
      setSearchParams(toSearchParams({ ...state, page: data.pages }), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, list.isPlaceholderData]);

  return { state, list, stats, today, update, reset };
}
