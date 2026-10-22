import { createBrowserRouter, Navigate } from "react-router";
import { NotFoundPage } from "@/pages/not-found-page";

// Pages load on demand, so the list doesn't ship the editor's form and date-picker code.
export const router = createBrowserRouter([
  { path: "/", element: <Navigate replace to="/invoices" /> },
  {
    path: "/invoices",
    lazy: () => import("@/pages/invoice-list-page").then((m) => ({ Component: m.InvoiceListPage })),
  },
  {
    path: "/invoices/new",
    lazy: () =>
      import("@/pages/invoice-page").then((m) => ({
        Component: () => <m.InvoicePage key="new" />,
      })),
  },
  {
    path: "/invoices/:invoiceId",
    lazy: () => import("@/pages/invoice-page").then((m) => ({ Component: m.InvoicePage })),
  },
  { path: "*", element: <NotFoundPage /> },
]);
