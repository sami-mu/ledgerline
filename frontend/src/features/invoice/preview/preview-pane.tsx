import { useLayoutEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import type { InvoiceFormValues } from "../schema";
import { useTotals } from "../use-totals";
import { InvoicePaper } from "./invoice-paper";

const PAPER_WIDTH = 816; // US Letter at 96 dpi
const GUTTER = 32;

/** Live preview, scaled down to fit the available width. */
export function PreviewPane() {
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
      const available = container.clientWidth - GUTTER * 2;
      setScale(Math.min(1, Math.max(0.3, available / PAPER_WIDTH)));
      setPaperHeight(paper.offsetHeight);
    });
    observer.observe(container);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex justify-center px-8 py-8">
      <div style={{ width: PAPER_WIDTH * scale, height: paperHeight * scale }}>
        <div
          ref={paperRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="w-[816px] rounded-xs shadow-paper"
        >
          <InvoicePaper values={values} totals={totals} className="min-h-[1056px]" />
        </div>
      </div>
    </div>
  );
}

/** Unscaled copy of the invoice that only exists in print. */
export function PrintableInvoice() {
  const values = useWatch<InvoiceFormValues>() as InvoiceFormValues;
  const totals = useTotals();
  return (
    <div className="hidden print:block">
      <InvoicePaper values={values} totals={totals} />
    </div>
  );
}
