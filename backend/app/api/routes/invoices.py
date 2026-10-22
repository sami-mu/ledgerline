from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import InvoiceEmailServiceDep, InvoiceServiceDep
from app.schemas.email import SendInvoiceIn
from app.schemas.invoice import (
    InvoiceIn,
    InvoiceListQuery,
    InvoiceOut,
    InvoicePage,
    InvoiceStats,
    MarkPaidIn,
    NextNumberOut,
)

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("", response_model=InvoicePage)
def list_invoices(
    query: Annotated[InvoiceListQuery, Query()], service: InvoiceServiceDep
) -> InvoicePage:
    """Search, filter, sort and page through invoices."""
    return service.list_page(query)


@router.get("/stats", response_model=InvoiceStats)
def invoice_stats(service: InvoiceServiceDep) -> InvoiceStats:
    """Headline figures for the list page, computed over every invoice."""
    return service.stats()


@router.get("/next-number", response_model=NextNumberOut)
def next_invoice_number(service: InvoiceServiceDep) -> NextNumberOut:
    return NextNumberOut(number=service.next_number())


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(payload: InvoiceIn, service: InvoiceServiceDep) -> InvoiceOut:
    return service.create(payload)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, service: InvoiceServiceDep) -> InvoiceOut:
    return service.get(invoice_id)


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: int, payload: InvoiceIn, service: InvoiceServiceDep) -> InvoiceOut:
    return service.update(invoice_id, payload)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: int, service: InvoiceServiceDep) -> None:
    service.delete(invoice_id)


@router.post("/{invoice_id}/send", response_model=InvoiceOut)
async def send_invoice(
    invoice_id: int, payload: SendInvoiceIn, service: InvoiceEmailServiceDep
) -> InvoiceOut:
    return await service.send(invoice_id, payload)


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceOut)
def mark_invoice_paid(
    invoice_id: int, payload: MarkPaidIn, service: InvoiceServiceDep
) -> InvoiceOut:
    return service.mark_paid(invoice_id, payload.paid_on)


@router.post("/{invoice_id}/mark-unpaid", response_model=InvoiceOut)
def mark_invoice_unpaid(invoice_id: int, service: InvoiceServiceDep) -> InvoiceOut:
    return service.mark_unpaid(invoice_id)
