import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, type InvoiceIn, type InvoiceOut, type SendInvoiceIn } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";

/** Queries derived from the set of invoices. */
function refreshDerived(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists });
  void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.stats });
  void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.nextNumber });
  void queryClient.invalidateQueries({ queryKey: ["customers"] });
}

function useInvoiceMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<InvoiceOut>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (invoice: InvoiceOut) => {
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);
      refreshDerived(queryClient);
    },
  });
}

export function useSaveInvoice(invoiceId: number | undefined) {
  return useInvoiceMutation((payload: InvoiceIn) =>
    invoiceId === undefined ? api.createInvoice(payload) : api.updateInvoice(invoiceId, payload),
  );
}

export function useSendInvoice() {
  return useInvoiceMutation(({ id, body }: { id: number; body: SendInvoiceIn }) =>
    api.sendInvoice(id, body),
  );
}

export function useMarkPaid() {
  return useInvoiceMutation(({ id, paidOn }: { id: number; paidOn: string }) =>
    api.markPaid(id, paidOn),
  );
}

export function useMarkUnpaid() {
  return useInvoiceMutation((id: number) => api.markUnpaid(id));
}

export function useRestoreInvoice() {
  return useInvoiceMutation((id: number) => api.restoreInvoice(id));
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteInvoice(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.invoices.detail(id) });
      refreshDerived(queryClient);
    },
  });
}
