import { ChevronRight, Menu, Printer, Send } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { TopBar } from "@/components/app/top-bar";
import { Button } from "@/components/ui/button";

export function InvoicePage() {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        start={
          <>
            <Button variant="ghost" size="icon" aria-label="All invoices">
              <Menu />
            </Button>
            <Brand />
            <ChevronRight className="size-3.5 text-ink-4" aria-hidden />
            <span className="num text-[13px] text-ink-2">INV-0001</span>
          </>
        }
        end={
          <>
            <Button>
              <Printer /> Print
            </Button>
            <Button variant="primary">
              <Send /> Send
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <section className="w-[clamp(460px,40vw,600px)] overflow-y-auto border-r border-line bg-surface p-5">
          Editor
        </section>
        <section className="flex-1 overflow-y-auto p-8">Preview</section>
      </div>
    </div>
  );
}
