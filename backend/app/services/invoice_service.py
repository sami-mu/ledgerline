import re
from collections.abc import Callable
from datetime import date, datetime, timedelta

from sqlalchemy.exc import IntegrityError

from app.core.errors import (
    BusinessRuleError,
    ConflictError,
    FieldIssue,
    InvoiceLockedError,
    NotFoundError,
)
from app.models import CustomField, EventKind, Invoice, InvoiceEvent, InvoiceStatus, LineItem
from app.repositories.invoice_repository import BucketRow, InvoiceRepository
from app.schemas.invoice import (
    Bucket,
    CustomFieldOut,
    EventOut,
    InvoiceIn,
    InvoiceListQuery,
    InvoiceOut,
    InvoicePage,
    InvoiceStats,
    InvoiceSummary,
    LineItemOut,
    StatusCounts,
    TotalsOut,
)
from app.services import money
from app.services.customer_service import CustomerService

NUMBER_PATTERN = re.compile(r"^(?P<prefix>.*?)(?P<digits>\d+)$")
DEFAULT_PREFIX = "INV-"


class InvoiceService:
    def __init__(
        self,
        repository: InvoiceRepository,
        customers: CustomerService,
        today: Callable[[], date] = date.today,
    ) -> None:
        self.repository = repository
        self.customers = customers

        self.today = today

    def list_page(self, query: InvoiceListQuery) -> InvoicePage:
        invoices, total, sum_cents = self.repository.search(query, self.today())
        return InvoicePage(
            items=[self._summary(invoice) for invoice in invoices],
            total=total,
            total_amount=money.from_minor(sum_cents),
            page=query.page,
            page_size=query.page_size,
            pages=max(1, -(-total // query.page_size)),
        )

    def stats(self) -> InvoiceStats:
        today = self.today()
        row = self.repository.stats(today, month_start=today.replace(day=1))

        def bucket(b: BucketRow) -> Bucket:
            return Bucket(count=b.count, total=money.from_minor(b.total_cents))

        return InvoiceStats(
            as_of=today,
            outstanding=bucket(row.outstanding),
            overdue=bucket(row.overdue),
            paid_this_month=bucket(row.paid_this_month),
            drafts=bucket(row.drafts),
            counts=StatusCounts(
                all=row.all_count,
                draft=row.drafts.count,
                outstanding=row.outstanding.count,
                overdue=row.overdue.count,
                paid=row.paid_count,
            ),
        )

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

    def create(self, data: InvoiceIn) -> InvoiceOut:
        data = self._with_terms(data)
        self._validate(data)
        invoice = Invoice()
        self._apply(invoice, data)
        self._link_customer(invoice)
        invoice.events.append(InvoiceEvent(kind=EventKind.CREATED))
        return self.to_out(self._persist(lambda: self.repository.add(invoice)))

    def update(self, invoice_id: int, data: InvoiceIn) -> InvoiceOut:
        invoice = self._get_or_raise(invoice_id)
        if invoice.status == InvoiceStatus.PAID:
            raise InvoiceLockedError(
                f"Invoice {invoice.number} is paid, so it's locked. Mark it as unpaid to edit it."
            )
        data = self._with_terms(data)
        self._validate(data, exclude_id=invoice_id)
        self._apply(invoice, data)
        self._link_customer(invoice)
        if invoice.status == InvoiceStatus.SENT and not invoice.changed_since_sent:
            invoice.changed_since_sent = True
            invoice.events.append(InvoiceEvent(kind=EventKind.EDITED_AFTER_SENT))
        return self.to_out(self._persist(lambda: self.repository.save(invoice)))

    def mark_sent(self, invoice_id: int, recipient: str, sent_at: datetime) -> InvoiceOut:
        invoice = self._get_or_raise(invoice_id)
        kind = EventKind.RESENT if invoice.sent_at else EventKind.SENT
        if invoice.status != InvoiceStatus.PAID:
            invoice.status = InvoiceStatus.SENT
        invoice.sent_at = sent_at
        invoice.last_sent_to = recipient
        invoice.changed_since_sent = False
        invoice.events.append(InvoiceEvent(kind=kind, detail=recipient, created_at=sent_at))
        return self.to_out(self.repository.save(invoice))

    def mark_paid(self, invoice_id: int, paid_on: date) -> InvoiceOut:
        invoice = self._get_or_raise(invoice_id)
        if invoice.status == InvoiceStatus.PAID:
            raise ConflictError(f"Invoice {invoice.number} is already marked as paid.")
        if paid_on > self.today():
            raise BusinessRuleError(
                [FieldIssue(("paid_on",), "Payment date can't be in the future.")]
            )
        if paid_on < invoice.issue_date:
            raise BusinessRuleError(
                [FieldIssue(("paid_on",), "Payment date can't be before the issue date.")]
            )
        invoice.status = InvoiceStatus.PAID
        invoice.paid_on = paid_on
        invoice.events.append(InvoiceEvent(kind=EventKind.PAID, detail=paid_on.isoformat()))
        return self.to_out(self.repository.save(invoice))

    def mark_unpaid(self, invoice_id: int) -> InvoiceOut:
        invoice = self._get_or_raise(invoice_id)
        if invoice.status != InvoiceStatus.PAID:
            raise ConflictError(f"Invoice {invoice.number} isn't marked as paid.")
        invoice.status = InvoiceStatus.SENT if invoice.sent_at else InvoiceStatus.DRAFT
        invoice.paid_on = None
        invoice.events.append(InvoiceEvent(kind=EventKind.REOPENED))
        return self.to_out(self.repository.save(invoice))

    def delete(self, invoice_id: int) -> None:
        self.repository.delete(self._get_or_raise(invoice_id))

    def backfill(self) -> int:
        """Fill in stored totals and customer links for invoices saved by older versions."""
        invoices = self.repository.needing_backfill()
        for invoice in invoices:
            if invoice.total_cents is None:
                invoice.total_cents = money.to_minor(self.totals_of(invoice).total)
            if invoice.customer_id is None:
                self._link_customer(invoice, used_at=invoice.updated_at)
        if invoices:
            self.repository.session.commit()
        return len(invoices)

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
            is_overdue=invoice.is_overdue(self.today()),
            business_name=invoice.business_name,
            business_email=invoice.business_email,
            business_address=invoice.business_address,
            customer_name=invoice.customer_name,
            customer_email=invoice.customer_email,
            customer_address=invoice.customer_address,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            payment_terms_days=invoice.payment_terms_days,
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
            changed_since_sent=invoice.changed_since_sent,
            paid_on=invoice.paid_on,
            events=[EventOut.model_validate(e) for e in invoice.events],
            created_at=invoice.created_at,
            updated_at=invoice.updated_at,
        )

    def _summary(self, invoice: Invoice) -> InvoiceSummary:
        return InvoiceSummary(
            id=invoice.id,
            number=invoice.number,
            status=invoice.status,
            is_overdue=invoice.is_overdue(self.today()),
            customer_name=invoice.customer_name,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            total=money.from_minor(invoice.total_cents)
            if invoice.total_cents is not None
            else self.totals_of(invoice).total,
            sent_at=invoice.sent_at,
            paid_on=invoice.paid_on,
            updated_at=invoice.updated_at,
        )

    def _get_or_raise(self, invoice_id: int) -> Invoice:
        invoice = self.repository.get(invoice_id)
        if invoice is None:
            raise NotFoundError(f"Invoice {invoice_id} was not found.")
        return invoice

    @staticmethod
    def _with_terms(data: InvoiceIn) -> InvoiceIn:
        """With payment terms set, the due date always follows from the issue date."""
        if data.payment_terms_days is None:
            return data
        due = data.issue_date + timedelta(days=data.payment_terms_days)
        return data.model_copy(update={"due_date": due})

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
            "payment_terms_days",
            "notes",
        ):
            setattr(invoice, field, getattr(data, field))
        invoice.discount = money.to_cents(data.discount)
        invoice.tax_rate = data.tax_rate
        # The editor always sends full lists, so children are replaced wholesale.
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
        invoice.total_cents = money.to_minor(InvoiceService.totals_of(invoice).total)

    def _link_customer(self, invoice: Invoice, used_at: datetime | None = None) -> None:
        customer = self.customers.remember(
            invoice.customer_name, invoice.customer_email, invoice.customer_address, used_at
        )
        invoice.customer_id = customer.id

    def _persist(self, write: Callable[[], Invoice]) -> Invoice:
        try:
            return write()
        except IntegrityError as exc:
            self.repository.session.rollback()
            raise ConflictError("Invoice number is already in use.") from exc
