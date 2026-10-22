from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.repositories.invoice_repository import InvoiceRepository
from app.services.email_sender import EmailSender, SmtpEmailSender
from app.services.invoice_email_service import InvoiceEmailService
from app.services.invoice_service import InvoiceService

DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_invoice_service(session: DbSession) -> InvoiceService:
    return InvoiceService(InvoiceRepository(session))


InvoiceServiceDep = Annotated[InvoiceService, Depends(get_invoice_service)]


def get_email_sender(settings: SettingsDep) -> EmailSender:
    return SmtpEmailSender(settings)


def get_invoice_email_service(
    invoices: InvoiceServiceDep,
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    settings: SettingsDep,
) -> InvoiceEmailService:
    return InvoiceEmailService(invoices, sender, settings)


InvoiceEmailServiceDep = Annotated[InvoiceEmailService, Depends(get_invoice_email_service)]
