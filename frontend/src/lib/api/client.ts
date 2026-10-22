import type { components } from "./schema";

type Schemas = components["schemas"];
export type InvoiceIn = Schemas["InvoiceIn"];
export type InvoiceOut = Schemas["InvoiceOut"];
export type InvoiceSummary = Schemas["InvoiceSummary"];
export type SendInvoiceIn = Schemas["SendInvoiceIn"];

/** A failed API call, with server field errors keyed by dotted path ("line_items.0.quantity"). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, code?: string, fieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  detail?: string | { loc: (string | number)[]; msg: string }[];
  code?: string;
};

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Non JSON error (proxy down, HTML error page): fall through to a generic message.
  }
  if (Array.isArray(body.detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of body.detail) {
      const path = issue.loc.slice(1).join(".");
      fieldErrors[path] ??= issue.msg.replace(/^Value error, /, "");
    }
    return new ApiError(
      response.status,
      "Some fields need attention.",
      "validation_error",
      fieldErrors,
    );
  }
  const fallback =
    response.status >= 500 ? "The server ran into a problem. Try again." : "Request failed.";
  return new ApiError(response.status, body.detail ?? fallback, body.code);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.", "network");
  }
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  listInvoices: () => request<InvoiceSummary[]>("/api/invoices"),
  getInvoice: (id: number) => request<InvoiceOut>(`/api/invoices/${id}`),
  nextNumber: () => request<Schemas["NextNumberOut"]>("/api/invoices/next-number"),
  createInvoice: (body: InvoiceIn) =>
    request<InvoiceOut>("/api/invoices", { method: "POST", body: JSON.stringify(body) }),
  updateInvoice: (id: number, body: InvoiceIn) =>
    request<InvoiceOut>(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  sendInvoice: (id: number, body: SendInvoiceIn) =>
    request<InvoiceOut>(`/api/invoices/${id}/send`, { method: "POST", body: JSON.stringify(body) }),
  deleteInvoice: (id: number) => request<void>(`/api/invoices/${id}`, { method: "DELETE" }),
  health: () => request<Schemas["HealthOut"]>("/api/health"),
};
