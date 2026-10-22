from datetime import UTC, date, datetime
from decimal import Decimal
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import Settings
from app.core.errors import EmailNotConfiguredError
from app.schemas.email import SendInvoiceIn
from app.schemas.invoice import InvoiceOut
from app.services.email_sender import EmailSender
from app.services.invoice_service import InvoiceService

TEMPLATES = Path(__file__).resolve().parent.parent / "templates" / "email"


def _usd(value: Decimal) -> str:
    return f"${value:,.2f}"


def _plain_decimal(value: Decimal) -> str:
    # 6.500 -> 6.5, 2 -> 2, never scientific notation.
    text = format(value, "f")
    return text.rstrip("0").rstrip(".") if "." in text else text


def _long_date(value: date) -> str:
    return f"{value:%b} {value.day}, {value.year}"


def _build_environment() -> Environment:
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters.update(usd=_usd, plain=_plain_decimal, long_date=_long_date)
    return env


class InvoiceEmailService:
    def __init__(self, invoices: InvoiceService, sender: EmailSender, settings: Settings) -> None:
        self.invoices = invoices
        self.sender = sender
        self.settings = settings
        self.env = _build_environment()

    async def send(self, invoice_id: int, data: SendInvoiceIn) -> InvoiceOut:
        if not self.settings.smtp_configured:
            raise EmailNotConfiguredError(
                "Email isn't set up on the server yet. Add the SMTP settings to backend/.env."
            )
        invoice = self.invoices.get(invoice_id)
        await self.sender.send(self.build_message(invoice, data))
        return self.invoices.mark_sent(invoice_id, data.to, datetime.now(UTC))

    def build_message(self, invoice: InvoiceOut, data: SendInvoiceIn) -> EmailMessage:
        context = {
            "invoice": invoice,
            "message": data.message,
            "custom_fields": [f for f in invoice.custom_fields if f.visible],
        }
        message = EmailMessage()
        message["Subject"] = data.subject
        message["From"] = formataddr(
            (self.settings.mail_from_name or invoice.business_name, self.settings.mail_from_address)
        )
        message["To"] = data.to
        if invoice.business_email:
            message["Reply-To"] = invoice.business_email
        message["Message-ID"] = make_msgid(domain=self.settings.mail_from_address.split("@")[-1])
        message.set_content(self.env.get_template("invoice.txt").render(context))
        message.add_alternative(
            self.env.get_template("invoice.html").render(context), subtype="html"
        )
        return message
