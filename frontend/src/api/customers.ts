import { http } from "./client";
import type { components } from "./schema";

export type Customer = components["schemas"]["CustomerOut"];

export const searchCustomers = (q: string, limit: number, signal?: AbortSignal) =>
  http.get<Customer[]>("/api/customers", { query: { q, limit }, signal });
