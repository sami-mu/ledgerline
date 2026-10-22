import { QueryClient } from "@tanstack/react-query";
import { ApiError, type InvoiceListParams } from "./api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 404 or a validation error only delays the message.
      retry: (count, error) =>
        count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

// Invalidating `invoices.lists` refreshes every page, filter and search at once.
export const queryKeys = {
  invoices: {
    lists: ["invoices", "list"] as const,
    list: (params: InvoiceListParams) => ["invoices", "list", params] as const,
    stats: ["invoices", "stats"] as const,
    detail: (id: number) => ["invoices", "detail", id] as const,
    nextNumber: ["invoices", "next-number"] as const,
  },
  customers: (q: string) => ["customers", q] as const,
  health: ["health"] as const,
};
