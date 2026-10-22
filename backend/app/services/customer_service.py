from datetime import datetime

from app.models import Customer
from app.models.invoice import utc_now
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerOut, CustomerQuery


class CustomerService:
    def __init__(self, repository: CustomerRepository) -> None:
        self.repository = repository

    def search(self, query: CustomerQuery) -> list[CustomerOut]:
        return [
            CustomerOut(
                id=row.customer.id,
                name=row.customer.name,
                email=row.customer.email,
                address=row.customer.address,
                invoice_count=row.invoice_count,
                last_used_at=row.customer.last_used_at,
            )
            for row in self.repository.search(query.q, query.limit)
        ]

    def remember(
        self, name: str, email: str, address: str, used_at: datetime | None = None
    ) -> Customer:
        """Find or create the customer and store the latest details (caller commits)."""
        key = Customer.key_for(name, email)
        customer = self.repository.get_by_key(key)
        if customer is None and email.strip():
            # A known name gaining an email upgrades that record rather than duplicating it.
            by_name = self.repository.get_by_key(Customer.key_for(name, ""))
            if by_name is not None:
                by_name.match_key = key
                customer = by_name
        if customer is None:
            customer = self.repository.add(Customer(match_key=key, name=name))
        customer.name = name
        customer.email = email
        customer.address = address
        customer.last_used_at = used_at or utc_now()
        return customer
