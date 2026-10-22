import enum
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class DecimalString(TypeDecorator[Decimal]):
    """Stores Decimals as text. SQLite has no exact numeric type, and money must stay exact."""

    impl = String(32)
    cache_ok = True

    def process_bind_param(self, value: Decimal | None, dialect) -> str | None:  # type: ignore[no-untyped-def]
        return None if value is None else str(value)

    def process_result_value(self, value: str | None, dialect) -> Decimal | None:  # type: ignore[no-untyped-def]
        return None if value is None else Decimal(value)


class InvoiceStatus(enum.StrEnum):
    DRAFT = "draft"
    SENT = "sent"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[InvoiceStatus] = mapped_column(String(16), default=InvoiceStatus.DRAFT)

    business_name: Mapped[str] = mapped_column(String(120))
    business_email: Mapped[str] = mapped_column(String(254), default="")
    business_address: Mapped[str] = mapped_column(Text, default="")

    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(254), default="")
    customer_address: Mapped[str] = mapped_column(Text, default="")

    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="")

    discount: Mapped[Decimal] = mapped_column(DecimalString, default=Decimal("0"))
    tax_rate: Mapped[Decimal] = mapped_column(DecimalString, default=Decimal("0"))

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_sent_to: Mapped[str] = mapped_column(String(254), default="")
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
