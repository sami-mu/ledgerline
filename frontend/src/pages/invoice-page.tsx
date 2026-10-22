import { useNavigate, useParams, useSearchParams } from "react-router";
import { InvoiceWorkspace } from "@/components/invoice/workspace/invoice-workspace";
import { duplicateValues, newInvoiceValues, toFormValues } from "@/components/invoice/form-mapping";
import { ApiError } from "@/api/client";
import { useInvoice, useLatestInvoice, useNextInvoiceNumber } from "@/hooks/api/use-invoices";
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
  const invoice = useInvoice(id);

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
  const nextNumber = useNextInvoiceNumber();
  const source = useInvoice(sourceId);
  const latest = useLatestInvoice(sourceId === undefined);
  const loading =
    nextNumber.isPending || (sourceId === undefined ? latest.isPending : source.isPending);
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
  const values = source.data
    ? duplicateValues(source.data, number)
    : newInvoiceValues(number, latest.data);
  return <InvoiceWorkspace defaultValues={values} />;
}
