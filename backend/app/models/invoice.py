import enum
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class DecimalString(TypeDecorator[Decimal]):
    """Decimals stored as text: SQLite has no exact numeric type."""

    impl = String(32)
    cache_ok = True

    def process_bind_param(self, value: Decimal | None, dialect) -> str | None:  # type: ignore[no-untyped-def]
        return None if value is None else str(value)

    def process_result_value(self, value: str | None, dialect) -> Decimal | None:  # type: ignore[no-untyped-def]
        return None if value is None else Decimal(value)


class InvoiceStatus(enum.StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"


class EventKind(enum.StrEnum):
    CREATED = "created"
    EDITED_AFTER_SENT = "edited_after_sent"
    SENT = "sent"
    RESENT = "resent"
    PAID = "paid"
    REOPENED = "reopened"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[InvoiceStatus] = mapped_column(String(16), default=InvoiceStatus.DRAFT)

    business_name: Mapped[str] = mapped_column(String(120))
    business_email: Mapped[str] = mapped_column(String(254), default="")
    business_address: Mapped[str] = mapped_column(Text, default="")

    # Customer details are copied onto the invoice so later customer edits never change it.
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), default=None, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(254), default="")
    customer_address: Mapped[str] = mapped_column(Text, default="")

    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    # Days from issue to due date (Net 30 = 30). None means a custom due date.
    payment_terms_days: Mapped[int | None] = mapped_column(Integer, default=None)
    notes: Mapped[str] = mapped_column(Text, default="")

    discount: Mapped[Decimal] = mapped_column(DecimalString, default=Decimal("0"))
    tax_rate: Mapped[Decimal] = mapped_column(DecimalString, default=Decimal("0"))
    # Derived by the service on every save, so the database can sort and sum it.
    total_cents: Mapped[int | None] = mapped_column(Integer, default=None, index=True)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_sent_to: Mapped[str] = mapped_column(String(254), default="")
    # Edited since last emailed, so the customer's copy is stale.
    changed_since_sent: Mapped[bool] = mapped_column(default=False, server_default=text("0"))
    paid_on: Mapped[date | None] = mapped_column(Date, default=None)
    # Soft delete, so a deletion can be undone. The number stays reserved.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    line_items: Mapped[list["LineItem"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="LineItem.position",
        lazy="selectin",
    )
    custom_fields: Mapped[list["CustomField"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="CustomField.position",
        lazy="selectin",
    )
    events: Mapped[list["InvoiceEvent"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="(InvoiceEvent.created_at.desc(), InvoiceEvent.id.desc())",
        lazy="selectin",
    )

    def is_overdue(self, today: date) -> bool:
        return self.status == InvoiceStatus.SENT and self.due_date < today


class LineItem(Base):
    __tablename__ = "line_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[Decimal] = mapped_column(DecimalString)
    unit_price: Mapped[Decimal] = mapped_column(DecimalString)

    invoice: Mapped[Invoice] = relationship(back_populates="line_items")


class CustomField(Base):
    __tablename__ = "custom_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(60))
    value: Mapped[str] = mapped_column(String(200), default="")
    visible: Mapped[bool] = mapped_column(default=True)

    invoice: Mapped[Invoice] = relationship(back_populates="custom_fields")


class InvoiceEvent(Base):
    """Activity log entry: what happened to an invoice and when."""

    __tablename__ = "invoice_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    kind: Mapped[EventKind] = mapped_column(String(32))
    detail: Mapped[str] = mapped_column(String(254), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    invoice: Mapped[Invoice] = relationship(back_populates="events")
