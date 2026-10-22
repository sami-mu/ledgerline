import asyncio
from datetime import UTC, datetime
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from app.core.config import Settings
from app.core.errors import EmailNotConfiguredError
from app.schemas.email import SendInvoiceIn
from app.schemas.invoice import InvoiceOut
from app.services.email_sender import EmailSender
from app.services.invoice_pdf import pdf_filename, render_invoice_pdf
from app.services.invoice_service import InvoiceService
from app.services.rendering import environment


class InvoiceEmailService:
    def __init__(self, invoices: InvoiceService, sender: EmailSender, settings: Settings) -> None:
        self.invoices = invoices
        self.sender = sender
        self.settings = settings
        self.env = environment()

    async def send(self, invoice_id: int, data: SendInvoiceIn) -> InvoiceOut:
        if not self.settings.smtp_configured:
            raise EmailNotConfiguredError(
                "Email isn't set up on the server yet. Add the SMTP settings to backend/.env."
            )
        invoice = self.invoices.get(invoice_id)
        # PDF rendering is CPU bound; keep it off the event loop.
        pdf = await asyncio.to_thread(render_invoice_pdf, invoice)
        await self.sender.send(self.build_message(invoice, data, pdf))
        return self.invoices.mark_sent(invoice_id, data.to, datetime.now(UTC))

    def build_message(self, invoice: InvoiceOut, data: SendInvoiceIn, pdf: bytes) -> EmailMessage:
        filename = pdf_filename(invoice)
        context = {"invoice": invoice, "message": data.message, "filename": filename}
        message = EmailMessage()
        message["Subject"] = data.subject
        message["From"] = formataddr(
            (self.settings.mail_from_name or invoice.business_name, self.settings.mail_from_address)
        )
        message["To"] = data.to
        if invoice.business_email:
            message["Reply-To"] = invoice.business_email
        message["Message-ID"] = make_msgid(domain=self.settings.mail_from_address.split("@")[-1])
        message.set_content(self.env.get_template("email/invoice.txt").render(context))
        message.add_alternative(
            self.env.get_template("email/invoice.html").render(context), subtype="html"
        )
        message.add_attachment(pdf, maintype="application", subtype="pdf", filename=filename)
        return message
