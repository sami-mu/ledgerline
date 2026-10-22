import { Copy, EllipsisVertical, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { InvoiceOut } from "@/api/invoices";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { InvoiceDeleteAction } from "./invoice-delete-action";

type Props = {
  invoice?: InvoiceOut;
  onDeleted: () => void;
};

export function InvoiceActionsMenu({ invoice, onDeleted }: Props) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPaid = invoice?.status === "paid";

  return (
    <>
      <DropdownMenu>
        <Tooltip content="More">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More invoice actions">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => window.print()} className="sm:hidden">
            <Printer /> Print or save PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!invoice}
            onSelect={() => invoice && navigate(`/invoices/new?from=${invoice.id}`)}
          >
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            tone="danger"
            disabled={!invoice || isPaid}
            onSelect={() => setConfirmDelete(true)}
          >
            <Trash2 /> {isPaid ? "Paid invoices can't be deleted" : "Delete invoice"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {invoice && (
        <InvoiceDeleteAction
          invoice={invoice}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}
