import { useNavigate } from "react-router";
import { PageMessage } from "./page-message";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <PageMessage
      title="Page not found"
      description="This address doesn't match anything in Ledgerline."
      action={{ label: "Go to invoices", onClick: () => navigate("/") }}
    />
  );
}
