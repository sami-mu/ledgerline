import re
from collections.abc import Callable

from sqlalchemy.exc import IntegrityError

from app.core.errors import BusinessRuleError, ConflictError, FieldIssue, NotFoundError
from app.models import CustomField, Invoice, LineItem
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import (
    CustomFieldOut,
    InvoiceIn,
    InvoiceOut,
    InvoiceSummary,
    LineItemOut,
    TotalsOut,
)
from app.services import money

NUMBER_PATTERN = re.compile(r"^(?P<prefix>.*?)(?P<digits>\d+)$")
DEFAULT_PREFIX = "INV-"


class InvoiceService:
    def __init__(self, repository: InvoiceRepository) -> None:
        self.repository = repository

    # Queries

    def list_all(self) -> list[InvoiceSummary]:
        return [self._summary(invoice) for invoice in self.repository.list_all()]

    def get(self, invoice_id: int) -> InvoiceOut:
        return self.to_out(self._get_or_raise(invoice_id))

    def next_number(self) -> str:
        """Suggest the number after the highest numeric suffix in use, e.g. INV-0007."""
        best: tuple[int, str, int] | None = None
        for number in self.repository.all_numbers():
            match = NUMBER_PATTERN.match(number)
            if match:
                value = int(match["digits"])
                if best is None or value > best[0]:
                    best = (value, match["prefix"], len(match["digits"]))
        if best is None:
            return f"{DEFAULT_PREFIX}0001"
        value, prefix, width = best
        return f"{prefix}{value + 1:0{width}d}"

    # Commands

    def create(self, data: InvoiceIn) -> InvoiceOut:
        self._validate(data)
        invoice = Invoice()
        self._apply(invoice, data)
        return self.to_out(self._persist(lambda: self.repository.add(invoice)))

    def update(self, invoice_id: int, data: InvoiceIn) -> InvoiceOut:
        invoice = self._get_or_raise(invoice_id)
        self._validate(data, exclude_id=invoice_id)
        self._apply(invoice, data)
        return self.to_out(self._persist(lambda: self.repository.save(invoice)))

    def delete(self, invoice_id: int) -> None:
        self.repository.delete(self._get_or_raise(invoice_id))

    # Mapping

    @staticmethod
    def totals_of(invoice: Invoice) -> money.Totals:
        lines = [(item.quantity, item.unit_price) for item in invoice.line_items]
        return money.compute_totals(lines, invoice.discount, invoice.tax_rate)

    def to_out(self, invoice: Invoice) -> InvoiceOut:
        totals = self.totals_of(invoice)
        return InvoiceOut(
            id=invoice.id,
            number=invoice.number,
            status=invoice.status,
            business_name=invoice.business_name,
            business_email=invoice.business_email,
            business_address=invoice.business_address,
            customer_name=invoice.customer_name,
            customer_email=invoice.customer_email,
            customer_address=invoice.customer_address,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            notes=invoice.notes,
            discount=invoice.discount,
            tax_rate=invoice.tax_rate,
            line_items=[
                LineItemOut(
                    id=item.id,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=money.line_total(item.quantity, item.unit_price),
                )
                for item in invoice.line_items
            ],
            custom_fields=[CustomFieldOut.model_validate(f) for f in invoice.custom_fields],
            totals=TotalsOut(
                subtotal=totals.subtotal,
                discount=totals.discount,
                tax=totals.tax,
                total=totals.total,
            ),
            sent_at=invoice.sent_at,
            last_sent_to=invoice.last_sent_to,
            created_at=invoice.created_at,
            updated_at=invoice.updated_at,
        )

    # Internals

    def _summary(self, invoice: Invoice) -> InvoiceSummary:
        return InvoiceSummary(
            id=invoice.id,
            number=invoice.number,
            status=invoice.status,
            customer_name=invoice.customer_name,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            total=self.totals_of(invoice).total,
            updated_at=invoice.updated_at,
        )

    def _get_or_raise(self, invoice_id: int) -> Invoice:
        invoice = self.repository.get(invoice_id)
        if invoice is None:
            raise NotFoundError(f"Invoice {invoice_id} was not found.")
        return invoice

    def _validate(self, data: InvoiceIn, exclude_id: int | None = None) -> None:
        """Rules that span several fields. Single field limits live in the schema."""
        issues: list[FieldIssue] = []
        if data.due_date < data.issue_date:
            issues.append(FieldIssue(("due_date",), "Due date can't be before the issue date."))

        subtotal = money.subtotal_of((i.quantity, i.unit_price) for i in data.line_items)
        if data.discount > subtotal:
            issues.append(
                FieldIssue(("discount",), f"Discount can't exceed the ${subtotal:,.2f} subtotal.")
            )
        if issues:
            raise BusinessRuleError(issues)

        if self.repository.number_exists(data.number, exclude_id=exclude_id):
            raise ConflictError(f"Invoice number {data.number} is already in use.")

    @staticmethod
    def _apply(invoice: Invoice, data: InvoiceIn) -> None:
        for field in (
            "number",
            "business_name",
            "business_email",
            "business_address",
            "customer_name",
            "customer_email",
            "customer_address",
            "issue_date",
            "due_date",
            "notes",
        ):
            setattr(invoice, field, getattr(data, field))
        invoice.discount = money.to_cents(data.discount)
        invoice.tax_rate = data.tax_rate
        # Children are replaced wholesale; the editor always sends the full list in order.
        invoice.line_items = [
            LineItem(
                position=index,
                description=item.description,
                quantity=item.quantity,
                unit_price=money.to_cents(item.unit_price),
            )
            for index, item in enumerate(data.line_items)
        ]
        invoice.custom_fields = [
            CustomField(position=index, label=f.label, value=f.value, visible=f.visible)
            for index, f in enumerate(data.custom_fields)
        ]

    def _persist(self, write: Callable[[], Invoice]) -> Invoice:
        try:
            return write()
        except IntegrityError as exc:
            self.repository.session.rollback()
            raise ConflictError("Invoice number is already in use.") from exc
