import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { InvoiceWorkspace } from "@/features/invoice/workspace";
import { newInvoiceValues, toFormValues } from "@/features/invoice/form-mapping";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { NotFoundPage } from "./not-found-page";
import { PageMessage } from "./page-message";

export function InvoicePage() {
  const { invoiceId } = useParams();
  if (invoiceId === undefined) return <NewInvoice />;
  const id = Number(invoiceId);
  if (!Number.isInteger(id) || id <= 0) return <NotFoundPage />;
  return <ExistingInvoice key={id} id={id} />;
}

function ExistingInvoice({ id }: { id: number }) {
  const navigate = useNavigate();
  const invoice = useQuery({ queryKey: queryKeys.invoice(id), queryFn: () => api.getInvoice(id) });

  if (invoice.isPending) return <PageMessage loading title="Opening invoice" />;
  if (invoice.isError) {
    const missing = invoice.error instanceof ApiError && invoice.error.status === 404;
    return (
      <PageMessage
        title={missing ? "Invoice not found" : "Couldn't open this invoice"}
        description={missing ? "It may have been deleted." : invoice.error.message}
        action={
          missing
            ? { label: "Go to invoices", onClick: () => navigate("/") }
            : { label: "Try again", onClick: () => invoice.refetch() }
        }
      />
    );
  }
  return <InvoiceWorkspace invoice={invoice.data} defaultValues={toFormValues(invoice.data)} />;
}

function NewInvoice() {
  const nextNumber = useQuery({ queryKey: queryKeys.nextNumber, queryFn: api.nextNumber });
  const list = useQuery({ queryKey: queryKeys.invoices, queryFn: api.listInvoices });
  const latestId = list.data?.[0]?.id;
  // Business details carry over from the most recent invoice.
  const latest = useQuery({
    queryKey: queryKeys.invoice(latestId ?? 0),
    queryFn: () => api.getInvoice(latestId!),
    enabled: latestId !== undefined,
  });

  const loading =
    nextNumber.isPending || list.isPending || (latestId !== undefined && latest.isPending);
  if (loading) return <PageMessage loading title="Preparing a new invoice" />;
  if (nextNumber.isError)
    return (
      <PageMessage
        title="Couldn't start a new invoice"
        description={nextNumber.error.message}
        action={{ label: "Try again", onClick: () => nextNumber.refetch() }}
      />
    );
  return <InvoiceWorkspace defaultValues={newInvoiceValues(nextNumber.data.number, latest.data)} />;
}
