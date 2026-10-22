import { createBrowserRouter, Navigate } from "react-router";
import { InvoiceListPage } from "@/pages/invoice-list-page";
import { InvoicePage } from "@/pages/invoice-page";
import { NotFoundPage } from "@/pages/not-found-page";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate replace to="/invoices" /> },
  { path: "/invoices", element: <InvoiceListPage /> },
  { path: "/invoices/new", element: <InvoicePage key="new" /> },
  { path: "/invoices/:invoiceId", element: <InvoicePage /> },
  { path: "*", element: <NotFoundPage /> },
]);
