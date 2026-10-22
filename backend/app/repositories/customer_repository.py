from dataclasses import dataclass

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Customer, Invoice
from app.repositories.query_utils import like_pattern


@dataclass(frozen=True)
class CustomerRow:
    customer: Customer
    invoice_count: int


class CustomerRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_key(self, match_key: str) -> Customer | None:
        return self.session.scalar(select(Customer).where(Customer.match_key == match_key))

    def add(self, customer: Customer) -> Customer:
        self.session.add(customer)
        self.session.flush()
        return customer

    def search(self, q: str, limit: int) -> list[CustomerRow]:
        """Most recently billed first. Matches anywhere in the name or email."""
        invoice_count = (
            select(func.count(Invoice.id))
            .where(Invoice.customer_id == Customer.id, Invoice.deleted_at.is_(None))
            .scalar_subquery()
        )
        stmt = select(Customer, invoice_count).order_by(
            Customer.last_used_at.desc(), Customer.id.desc()
        )
        if q:
            pattern = like_pattern(q)
            stmt = stmt.where(
                or_(
                    Customer.name.ilike(pattern, escape="\\"),
                    Customer.email.ilike(pattern, escape="\\"),
                )
            )
        return [CustomerRow(c, n) for c, n in self.session.execute(stmt.limit(limit))]
