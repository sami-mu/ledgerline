import { createBrowserRouter } from "react-router";
import { HomeRedirect } from "@/pages/home-redirect";
import { InvoicePage } from "@/pages/invoice-page";
import { NotFoundPage } from "@/pages/not-found-page";

export const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  { path: "/invoices/new", element: <InvoicePage key="new" /> },
  { path: "/invoices/:invoiceId", element: <InvoicePage /> },
  { path: "*", element: <NotFoundPage /> },
]);
