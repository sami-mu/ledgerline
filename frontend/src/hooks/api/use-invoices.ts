import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getInvoice,
  getInvoiceStats,
  getNextInvoiceNumber,
  listInvoices,
  type InvoiceListParams,
} from "@/api/invoices";
import { queryKeys } from "./query-keys";

/** A page of invoices. The previous page stays on screen while the next one loads. */
export function useInvoiceList(params: InvoiceListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: ({ signal }) => listInvoices(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInvoiceStats() {
  return useQuery({ queryKey: queryKeys.invoices.stats, queryFn: getInvoiceStats });
}

export function useInvoice(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id ?? 0),
    queryFn: () => getInvoice(id!),
    enabled: id !== undefined,
  });
}

export function useNextInvoiceNumber() {
  return useQuery({ queryKey: queryKeys.invoices.nextNumber, queryFn: getNextInvoiceNumber });
}

const LATEST = { sort: "updated_at", direction: "desc", page_size: 1 } as const;

/** The most recently edited invoice, whose business details carry over to new ones. */
export function useLatestInvoice(enabled: boolean) {
  const list = useInvoiceList(LATEST, enabled);
  const latestId = list.data?.items[0]?.id;
  const invoice = useInvoice(latestId);
  return {
    data: invoice.data,
    isPending: enabled && (list.isPending || (latestId !== undefined && invoice.isPending)),
  };
}
