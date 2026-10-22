import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export function InvoicesHeader() {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Invoices</h1>
      <Button variant="primary" onClick={() => navigate("/invoices/new")}>
        <Plus /> New invoice
      </Button>
    </header>
  );
}
