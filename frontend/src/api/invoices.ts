import { http } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type InvoiceIn = Schemas["InvoiceIn"];
export type InvoiceOut = Schemas["InvoiceOut"];
export type InvoiceSummary = Schemas["InvoiceSummary"];
export type InvoicePage = Schemas["InvoicePage"];
export type InvoiceStats = Schemas["InvoiceStats"];
export type InvoiceEvent = Schemas["EventOut"];
export type InvoiceStatus = InvoiceOut["status"];
export type SendInvoiceIn = Schemas["SendInvoiceIn"];

export type InvoiceListParams = {
  q?: string;
  status?: "all" | "draft" | "outstanding" | "overdue" | "paid";
  sort?: "number" | "customer" | "issue_date" | "due_date" | "status" | "total" | "updated_at";
  direction?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export const listInvoices = (params: InvoiceListParams, signal?: AbortSignal) =>
  http.get<InvoicePage>("/api/invoices", { query: params, signal });

export const getInvoiceStats = () => http.get<InvoiceStats>("/api/invoices/stats");

export const getInvoice = (id: number) => http.get<InvoiceOut>(`/api/invoices/${id}`);

export const getNextInvoiceNumber = () =>
  http.get<Schemas["NextNumberOut"]>("/api/invoices/next-number");

export const createInvoice = (body: InvoiceIn) => http.post<InvoiceOut>("/api/invoices", body);

export const updateInvoice = (id: number, body: InvoiceIn) =>
  http.put<InvoiceOut>(`/api/invoices/${id}`, body);

export const deleteInvoice = (id: number) => http.delete(`/api/invoices/${id}`);

export const restoreInvoice = (id: number) => http.post<InvoiceOut>(`/api/invoices/${id}/restore`);

export const sendInvoice = (id: number, body: SendInvoiceIn) =>
  http.post<InvoiceOut>(`/api/invoices/${id}/send`, body);

export const markInvoicePaid = (id: number, paidOn: string) =>
  http.post<InvoiceOut>(`/api/invoices/${id}/mark-paid`, { paid_on: paidOn });

export const markInvoiceUnpaid = (id: number) =>
  http.post<InvoiceOut>(`/api/invoices/${id}/mark-unpaid`);
