from fastapi import APIRouter, status

from app.api.deps import InvoiceEmailServiceDep, InvoiceServiceDep
from app.schemas.email import SendInvoiceIn
from app.schemas.invoice import InvoiceIn, InvoiceOut, InvoiceSummary, NextNumberOut

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceSummary])
def list_invoices(service: InvoiceServiceDep) -> list[InvoiceSummary]:
    return service.list_all()


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
