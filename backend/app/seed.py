"""Fictional demo data. `uv run python -m app.seed --count 40` adds a spread of invoices."""

import argparse
import random
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, init_schema
from app.models import Invoice
from app.repositories.customer_repository import CustomerRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import CustomFieldIn, InvoiceIn, LineItemIn
from app.services.customer_service import CustomerService
from app.services.invoice_service import InvoiceService

BUSINESS = {
    "business_name": "Fieldnote Studio",
    "business_email": "billing@fieldnote.example",
    "business_address": "220 Harbor Street, Suite 4\nPortland, OR 97204",
}

CUSTOMERS = [
    ("Alder & Pine Coffee Co.", "accounts@alderpine.example", "18 Market Lane\nSeattle, WA 98101"),
    ("Harbor Light Books", "ap@harborlight.example", "9 Wharf Road\nAstoria, OR 97103"),
    ("Northwind Bakery", "orders@northwind.example", "410 Elm Avenue\nBoise, ID 83702"),
    ("Juniper Health Clinic", "finance@juniperhealth.example", "75 Cedar Court\nBend, OR 97701"),
    ("Copperline Cycles", "hello@copperline.example", "1200 Grand Street\nTacoma, WA 98402"),
    ("Meridian Architects", "billing@meridian.example", "3 Plaza Way\nSpokane, WA 99201"),
    ("Tidewater Outfitters", "ap@tidewater.example", "88 Bay Boulevard\nEureka, CA 95501"),
    ("Small Batch Ceramics", "studio@smallbatch.example", "52 Kiln Lane\nEugene, OR 97401"),
]

SERVICES = [
    ("Brand identity refresh", "2400.00"),
    ("Packaging design, per SKU", "450.00"),
    ("Art direction (hours)", "120.00"),
    ("Website design, landing page", "1800.00"),
    ("Illustration set", "650.00"),
    ("Photography day rate", "1100.00"),
    ("Print production management", "380.00"),
]


def invoice_service(session: Session) -> InvoiceService:
    return InvoiceService(InvoiceRepository(session), CustomerService(CustomerRepository(session)))


def seed_demo_invoice(session: Session) -> None:
    if session.scalar(select(Invoice.id).limit(1)) is not None:
        return
    issue = date.today()
    name, email, address = CUSTOMERS[0]
    invoice_service(session).create(
        InvoiceIn(
            number="INV-0001",
            **BUSINESS,
            customer_name=name,
            customer_email=email,
            customer_address=address,
            issue_date=issue,
            due_date=issue + timedelta(days=14),
            payment_terms_days=14,
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


def seed_many(session: Session, count: int, rng: random.Random) -> int:
    """Add `count` invoices spread over the last five months, in every status."""
    service = invoice_service(session)
    today = date.today()
    for _ in range(count):
        name, email, address = rng.choice(CUSTOMERS)
        issue = today - timedelta(days=rng.randint(0, 150))
        terms = rng.choice([14, 15, 30, 30, 45])
        lines = [
            LineItemIn(
                description=description,
                quantity=Decimal(rng.choice(["1", "1", "2", "3", "4.5", "6"])),
                unit_price=Decimal(price),
            )
            for description, price in rng.sample(SERVICES, rng.randint(1, 3))
        ]
        created = service.create(
            InvoiceIn(
                number=service.next_number(),
                **BUSINESS,
                customer_name=name,
                customer_email=email,
                customer_address=address,
                issue_date=issue,
                due_date=issue,
                payment_terms_days=terms,
                notes="Thank you for your business.",
                tax_rate=Decimal(rng.choice(["0", "8.5", "10"])),
                line_items=lines,
            )
        )
        roll = rng.random()
        if roll < 0.2:
            continue  # stays a draft
        service.mark_sent(created.id, email, sent_at=_at(issue))
        due = issue + timedelta(days=terms)
        if roll < 0.75 and due - timedelta(days=3) <= today:
            paid_on = min(today, due - timedelta(days=rng.randint(-10, 3)))
            service.mark_paid(created.id, max(paid_on, issue))
    return count


def _at(day: date) -> datetime:
    return datetime.combine(day, time(15, 0), tzinfo=UTC)


def main() -> None:
    parser = argparse.ArgumentParser(description="Add fictional demo invoices.")
    parser.add_argument("--count", type=int, default=40)
    parser.add_argument("--seed", type=int, default=7, help="Random seed, for repeatable data")
    args = parser.parse_args()
    init_schema(engine)
    with SessionLocal() as session:
        added = seed_many(session, args.count, random.Random(args.seed))
    print(f"Added {added} demo invoices.")


if __name__ == "__main__":
    main()
