from dataclasses import dataclass
from datetime import date

from sqlalchemy import ColumnElement, and_, case, func, or_, select
from sqlalchemy.orm import Session, lazyload

from app.models import Invoice, InvoiceStatus
from app.repositories.query_utils import like_pattern
from app.schemas.invoice import InvoiceListQuery


@dataclass(frozen=True)
class BucketRow:
    count: int
    total_cents: int


@dataclass(frozen=True)
class StatsRow:
    outstanding: BucketRow
    overdue: BucketRow
    paid_this_month: BucketRow
    drafts: BucketRow
    paid_count: int
    all_count: int


class InvoiceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, invoice_id: int) -> Invoice | None:
        return self.session.get(Invoice, invoice_id)

    def search(self, query: InvoiceListQuery, today: date) -> tuple[list[Invoice], int, int]:
        """One page of matching invoices, plus the count and summed total of every match."""
        conditions = self._conditions(query, today)
        count, sum_cents = self.session.execute(
            select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.total_cents), 0)).where(
                *conditions
            )
        ).one()

        order = self._order_by(query, today)
        stmt = (
            select(Invoice)
            # Summaries need only invoice columns.
            .options(
                lazyload(Invoice.line_items),
                lazyload(Invoice.custom_fields),
                lazyload(Invoice.events),
            )
            .where(*conditions)
            .order_by(order, Invoice.id.desc())
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        )
        return list(self.session.scalars(stmt)), count, sum_cents

    def stats(self, today: date, month_start: date) -> StatsRow:
        cents = func.coalesce(Invoice.total_cents, 0)
        is_sent = Invoice.status == InvoiceStatus.SENT
        is_overdue = and_(is_sent, Invoice.due_date < today)
        paid_this_month = and_(
            Invoice.status == InvoiceStatus.PAID,
            Invoice.paid_on >= month_start,
            Invoice.paid_on <= today,
        )
        is_draft = Invoice.status == InvoiceStatus.DRAFT

        def count_where(condition: ColumnElement[bool]) -> ColumnElement[int]:
            return func.coalesce(func.sum(case((condition, 1), else_=0)), 0)

        def sum_where(condition: ColumnElement[bool]) -> ColumnElement[int]:
            return func.coalesce(func.sum(case((condition, cents), else_=0)), 0)

        row = self.session.execute(
            select(
                count_where(is_sent),
                sum_where(is_sent),
                count_where(is_overdue),
                sum_where(is_overdue),
                count_where(paid_this_month),
                sum_where(paid_this_month),
                count_where(is_draft),
                sum_where(is_draft),
                count_where(Invoice.status == InvoiceStatus.PAID),
                func.count(Invoice.id),
            )
        ).one()
        return StatsRow(
            outstanding=BucketRow(row[0], row[1]),
            overdue=BucketRow(row[2], row[3]),
            paid_this_month=BucketRow(row[4], row[5]),
            drafts=BucketRow(row[6], row[7]),
            paid_count=row[8],
            all_count=row[9],
        )

    def number_exists(self, number: str, exclude_id: int | None = None) -> bool:
        stmt = select(Invoice.id).where(Invoice.number == number)
        if exclude_id is not None:
            stmt = stmt.where(Invoice.id != exclude_id)
        return self.session.scalar(stmt.limit(1)) is not None

    def all_numbers(self) -> list[str]:
        return list(self.session.scalars(select(Invoice.number)))

    def needing_backfill(self) -> list[Invoice]:
        """Invoices saved before totals were stored or customers were linked."""
        stmt = select(Invoice).where(
            or_(Invoice.total_cents.is_(None), Invoice.customer_id.is_(None))
        )
        return list(self.session.scalars(stmt))

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

    @staticmethod
    def _conditions(query: InvoiceListQuery, today: date) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = []
        match query.status:
            case "draft":
                conditions.append(Invoice.status == InvoiceStatus.DRAFT)
            case "outstanding":
                conditions.append(Invoice.status == InvoiceStatus.SENT)
            case "overdue":
                conditions.append(Invoice.status == InvoiceStatus.SENT)
                conditions.append(Invoice.due_date < today)
            case "paid":
                conditions.append(Invoice.status == InvoiceStatus.PAID)
            case "all":
                pass
        if query.q:
            pattern = like_pattern(query.q)
            conditions.append(
                or_(
                    Invoice.number.ilike(pattern, escape="\\"),
                    Invoice.customer_name.ilike(pattern, escape="\\"),
                    Invoice.customer_email.ilike(pattern, escape="\\"),
                )
            )
        return conditions

    @staticmethod
    def _order_by(query: InvoiceListQuery, today: date) -> ColumnElement:
        column: ColumnElement
        match query.sort:
            case "number":
                column = Invoice.number
            case "customer":
                column = func.lower(Invoice.customer_name)
            case "issue_date":
                column = Invoice.issue_date
            case "due_date":
                column = Invoice.due_date
            case "total":
                column = func.coalesce(Invoice.total_cents, 0)
            case "updated_at":
                column = Invoice.updated_at
            case "status":
                # Most urgent first when ascending: overdue, sent, draft, paid.
                column = case(
                    (and_(Invoice.status == InvoiceStatus.SENT, Invoice.due_date < today), 0),
                    (Invoice.status == InvoiceStatus.SENT, 1),
                    (Invoice.status == InvoiceStatus.DRAFT, 2),
                    else_=3,
                )
        return column.asc() if query.direction == "asc" else column.desc()
