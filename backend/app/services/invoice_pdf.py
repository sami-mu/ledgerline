from weasyprint import HTML

from app.schemas.invoice import InvoiceOut
from app.services.rendering import TEMPLATES, environment


def render_invoice_pdf(invoice: InvoiceOut) -> bytes:
    """The invoice as a US Letter PDF, matching the printed layout. Hidden fields are left out."""
    html = (
        environment()
        .get_template("pdf/invoice.html")
        .render(
            invoice=invoice,
            custom_fields=[f for f in invoice.custom_fields if f.visible],
        )
    )
    # base_url lets the template load its bundled fonts by relative path.
    return HTML(string=html, base_url=str(TEMPLATES / "pdf")).write_pdf()


def pdf_filename(invoice: InvoiceOut) -> str:
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in invoice.number)
    return f"{safe or 'invoice'}.pdf"
