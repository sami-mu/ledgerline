import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { InvoiceWorkspace } from "@/features/invoice/workspace";
import { duplicateValues, newInvoiceValues, toFormValues } from "@/features/invoice/form-mapping";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { NotFoundPage } from "./not-found-page";
import { PageMessage } from "./page-message";

export function InvoicePage() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  if (invoiceId === undefined) {
    const from = Number(searchParams.get("from"));
    const sourceId = Number.isInteger(from) && from > 0 ? from : undefined;
    return <NewInvoice key={sourceId ?? "blank"} sourceId={sourceId} />;
  }
  const id = Number(invoiceId);
  if (!Number.isInteger(id) || id <= 0) return <NotFoundPage />;
  return <ExistingInvoice key={id} id={id} />;
}

function ExistingInvoice({ id }: { id: number }) {
  const navigate = useNavigate();
  const invoice = useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => api.getInvoice(id),
  });

  if (invoice.isPending) return <PageMessage loading title="Opening invoice" />;
  if (invoice.isError) {
    const missing = invoice.error instanceof ApiError && invoice.error.status === 404;
    return (
      <PageMessage
        title={missing ? "Invoice not found" : "Couldn't open this invoice"}
        description={missing ? "It may have been deleted." : invoice.error.message}
        action={
          missing
            ? { label: "Go to invoices", onClick: () => navigate("/invoices") }
            : { label: "Try again", onClick: () => invoice.refetch() }
        }
      />
    );
  }
  return <InvoiceWorkspace invoice={invoice.data} defaultValues={toFormValues(invoice.data)} />;
}

/** A blank invoice, or a copy of `sourceId` when duplicating. */
function NewInvoice({ sourceId }: { sourceId?: number }) {
  const nextNumber = useQuery({
    queryKey: queryKeys.invoices.nextNumber,
    queryFn: api.nextNumber,
  });
  // The most recently edited invoice, whose business details and terms carry over.
  const latestParams = { sort: "updated_at", direction: "desc", page_size: 1 } as const;
  const list = useQuery({
    queryKey: queryKeys.invoices.list(latestParams),
    queryFn: ({ signal }) => api.listInvoices(latestParams, signal),
    enabled: sourceId === undefined,
  });
  const latestId = sourceId ?? list.data?.items[0]?.id;
  const latest = useQuery({
    queryKey: queryKeys.invoices.detail(latestId ?? 0),
    queryFn: () => api.getInvoice(latestId!),
    enabled: latestId !== undefined,
  });

  const loading =
    nextNumber.isPending ||
    (sourceId === undefined && list.isPending) ||
    (latestId !== undefined && latest.isPending);
  if (loading) return <PageMessage loading title="Preparing a new invoice" />;
  if (nextNumber.isError)
    return (
      <PageMessage
        title="Couldn't start a new invoice"
        description={nextNumber.error.message}
        action={{ label: "Try again", onClick: () => nextNumber.refetch() }}
      />
    );
  const number = nextNumber.data.number;
  const values =
    sourceId !== undefined && latest.data
      ? duplicateValues(latest.data, number)
      : newInvoiceValues(number, latest.data);
  return <InvoiceWorkspace defaultValues={values} />;
}
