import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { PageMessage } from "./page-message";

/** "/" opens the most recently edited invoice, or a blank one on first use. */
export function HomeRedirect() {
  const invoices = useQuery({ queryKey: queryKeys.invoices, queryFn: api.listInvoices });

  if (invoices.isPending) return <PageMessage loading title="Loading invoices" />;
  if (invoices.isError)
    return (
      <PageMessage
        title="Couldn't load invoices"
        description={invoices.error.message}
        action={{ label: "Try again", onClick: () => invoices.refetch() }}
      />
    );
  const latest = invoices.data[0];
  return <Navigate replace to={latest ? `/invoices/${latest.id}` : "/invoices/new"} />;
}
