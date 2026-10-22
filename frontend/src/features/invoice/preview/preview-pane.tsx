import { useLayoutEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import type { InvoiceFormValues } from "../schema";
import { useTotals } from "../use-totals";
import { InvoicePaper } from "./invoice-paper";

const PAPER_WIDTH = 816; // US Letter at 96 dpi

export function PreviewPane({ paidOn }: { paidOn?: string }) {
  const values = useWatch<InvoiceFormValues>() as InvoiceFormValues;
  const totals = useTotals();
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState(1056);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const paper = paperRef.current;
    if (!container || !paper) return;
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(container);
      const available =
        container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setScale(Math.min(1, Math.max(0.3, available / PAPER_WIDTH)));
      setPaperHeight(paper.offsetHeight);
    });
    observer.observe(container);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex justify-center px-4 py-5 sm:px-8 sm:py-8">
      <div style={{ width: PAPER_WIDTH * scale, height: paperHeight * scale }}>
        <div
          ref={paperRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="w-[816px] rounded-xs shadow-paper"
        >
          <InvoicePaper
            values={values}
            totals={totals}
            paidOn={paidOn}
            className="min-h-[1056px]"
          />
        </div>
      </div>
    </div>
  );
}

/** Unscaled copy, used only when printing. */
export function PrintableInvoice({ paidOn }: { paidOn?: string }) {
  const values = useWatch<InvoiceFormValues>() as InvoiceFormValues;
  const totals = useTotals();
  return (
    <div className="hidden print:block">
      <InvoicePaper values={values} totals={totals} paidOn={paidOn} />
    </div>
  );
}
