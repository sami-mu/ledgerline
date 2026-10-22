import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InvoiceIn, type InvoiceOut, type InvoiceSummary } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";

export function useSaveInvoice(invoiceId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceIn) =>
      invoiceId === undefined ? api.createInvoice(payload) : api.updateInvoice(invoiceId, payload),
    onSuccess: (saved: InvoiceOut) => {
      queryClient.setQueryData(queryKeys.invoice(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices, exact: true });
      void queryClient.invalidateQueries({ queryKey: queryKeys.nextNumber });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteInvoice(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.invoice(id) });
      // Drop it from the cached list right away so "/" never redirects to a deleted invoice.
      queryClient.setQueryData<InvoiceSummary[]>(queryKeys.invoices, (list) =>
        list?.filter((invoice) => invoice.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices, exact: true });
      void queryClient.invalidateQueries({ queryKey: queryKeys.nextNumber });
    },
  });
}
