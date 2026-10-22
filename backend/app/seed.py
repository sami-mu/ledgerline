"""Fictional demo data so the first run shows a realistic invoice."""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Invoice
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import CustomFieldIn, InvoiceIn, LineItemIn
from app.services.invoice_service import InvoiceService


def seed_demo_invoice(session: Session) -> None:
    if session.scalar(select(Invoice.id).limit(1)) is not None:
        return
    issue = date.today()
    InvoiceService(InvoiceRepository(session)).create(
        InvoiceIn(
            number="INV-0001",
            business_name="Fieldnote Studio",
            business_email="billing@fieldnote.example",
            business_address="220 Harbor Street, Suite 4\nPortland, OR 97204",
            customer_name="Alder & Pine Coffee Co.",
            customer_email="accounts@alderpine.example",
            customer_address="18 Market Lane\nSeattle, WA 98101",
            issue_date=issue,
            due_date=issue + timedelta(days=14),
            notes="Thank you for your business. Payment is due within 14 days by ACH transfer.",
            discount=Decimal("150.00"),
            tax_rate=Decimal("8.5"),
            line_items=[
                LineItemIn(
                    description="Brand identity refresh",
                    quantity=Decimal("1"),
                    unit_price=Decimal("2400.00"),
                ),
                LineItemIn(
                    description="Packaging design, 3 SKUs",
                    quantity=Decimal("3"),
                    unit_price=Decimal("450.00"),
                ),
                LineItemIn(
                    description="Art direction (hours)",
                    quantity=Decimal("6.5"),
                    unit_price=Decimal("120.00"),
                ),
            ],
            custom_fields=[
                CustomFieldIn(label="PO number", value="AP-2291"),
                CustomFieldIn(label="Project", value="Spring menu launch"),
                CustomFieldIn(label="Internal ref", value="FS-114", visible=False),
            ],
        )
    )
