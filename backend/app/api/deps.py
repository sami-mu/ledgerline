from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.invoice_repository import InvoiceRepository
from app.services.invoice_service import InvoiceService

DbSession = Annotated[Session, Depends(get_db)]


def get_invoice_service(session: DbSession) -> InvoiceService:
    return InvoiceService(InvoiceRepository(session))


InvoiceServiceDep = Annotated[InvoiceService, Depends(get_invoice_service)]
