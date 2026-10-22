from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Invoice


class InvoiceRepository:
    """Data access for invoices. No business rules live here."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list_all(self) -> list[Invoice]:
        stmt = select(Invoice).order_by(Invoice.updated_at.desc(), Invoice.id.desc())
        return list(self.session.scalars(stmt))

    def get(self, invoice_id: int) -> Invoice | None:
        return self.session.get(Invoice, invoice_id)

    def number_exists(self, number: str, exclude_id: int | None = None) -> bool:
        stmt = select(Invoice.id).where(Invoice.number == number)
        if exclude_id is not None:
            stmt = stmt.where(Invoice.id != exclude_id)
        return self.session.scalar(stmt.limit(1)) is not None

    def all_numbers(self) -> list[str]:
        return list(self.session.scalars(select(Invoice.number)))

    def add(self, invoice: Invoice) -> Invoice:
        self.session.add(invoice)
        self.session.commit()
        self.session.refresh(invoice)
        return invoice

    def save(self, invoice: Invoice) -> Invoice:
        self.session.commit()
        self.session.refresh(invoice)
        return invoice

    def delete(self, invoice: Invoice) -> None:
        self.session.delete(invoice)
        self.session.commit()
