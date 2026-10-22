import type { InvoiceListParams } from "@/api/invoices";

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
