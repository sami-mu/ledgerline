import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Menu, Printer, Send } from "lucide-react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Brand } from "@/components/app/brand";
import { TopBar } from "@/components/app/top-bar";
import { Button } from "@/components/ui/button";
import type { InvoiceOut } from "@/lib/api/client";
import { InvoiceEditor } from "./editor/invoice-editor";
import { PreviewPane, PrintableInvoice } from "./preview/preview-pane";
import { invoiceFormSchema, type InvoiceFormValues } from "./schema";

type Props = {
  /** The saved invoice, or undefined for a new one. */
  invoice?: InvoiceOut;
  defaultValues: InvoiceFormValues;
};

export function InvoiceWorkspace({ defaultValues }: Props) {
  const form = useForm<InvoiceFormValues>({
    defaultValues,
    resolver: zodResolver(invoiceFormSchema),
    mode: "onTouched",
  });

  return (
    <FormProvider {...form}>
      <div className="flex h-dvh flex-col print:hidden">
        <TopBar
          start={
            <>
              <Button variant="ghost" size="icon" aria-label="All invoices">
                <Menu />
              </Button>
              <Brand />
              <ChevronRight className="size-3.5 text-ink-4" aria-hidden />
              <InvoiceNumber />
            </>
          }
          end={
            <>
              <Button onClick={() => window.print()}>
                <Printer /> Print
              </Button>
              <Button variant="primary">
                <Send /> Send
              </Button>
            </>
          }
        />
        <div className="flex min-h-0 flex-1">
          <form
            noValidate
            onSubmit={(event) => event.preventDefault()}
            aria-label="Invoice editor"
            className="w-[clamp(460px,42vw,600px)] shrink-0 overflow-y-auto border-r border-line bg-surface"
          >
            <InvoiceEditor />
          </form>
          <section aria-label="Invoice preview" className="min-w-0 flex-1 overflow-y-auto">
            <PreviewPane />
          </section>
        </div>
      </div>
      <PrintableInvoice />
    </FormProvider>
  );
}

function InvoiceNumber() {
  const number = useWatch<InvoiceFormValues, "number">({ name: "number" });
  return <span className="truncate num text-[13px] text-ink-2">{number || "Untitled"}</span>;
}
