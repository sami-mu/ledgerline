from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    StringConstraints,
)
from pydantic.networks import validate_email

# Limits match the frontend schema in src/features/invoice/schema.ts.
Text = Annotated[str, StringConstraints(strip_whitespace=True)]
RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def _optional_email(value: str) -> str:
    # An empty string means "not provided"; anything else must be a valid address.
    if value:
        validate_email(value)
    return value


OptionalEmail = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=254), AfterValidator(_optional_email)
]
Quantity = Annotated[Decimal, Field(ge=0, le=1_000_000, decimal_places=3)]
Money = Annotated[Decimal, Field(ge=0, le=100_000_000, decimal_places=2)]
TaxRate = Annotated[Decimal, Field(ge=0, le=100, decimal_places=3)]


class LineItemIn(BaseModel):
    description: Annotated[RequiredText, StringConstraints(max_length=200)]
    quantity: Quantity
    unit_price: Money


class CustomFieldIn(BaseModel):
    label: Annotated[RequiredText, StringConstraints(max_length=60)]
    value: Annotated[Text, StringConstraints(max_length=200)] = ""
    visible: bool = True


class InvoiceIn(BaseModel):
    """Payload for create and update. Totals are never accepted from the client."""

    model_config = ConfigDict(extra="ignore")

    number: Annotated[RequiredText, StringConstraints(max_length=32)]
    business_name: Annotated[RequiredText, StringConstraints(max_length=120)]
    business_email: OptionalEmail = ""
    business_address: Annotated[Text, StringConstraints(max_length=500)] = ""
    customer_name: Annotated[RequiredText, StringConstraints(max_length=120)]
    customer_email: OptionalEmail = ""
    customer_address: Annotated[Text, StringConstraints(max_length=500)] = ""
    issue_date: date
    due_date: date
    # Net days. When set, the server derives due_date from issue_date.
    payment_terms_days: Annotated[int, Field(ge=0, le=365)] | None = None
    notes: Annotated[Text, StringConstraints(max_length=2000)] = ""
    discount: Money = Decimal("0")
    tax_rate: TaxRate = Decimal("0")
    line_items: Annotated[list[LineItemIn], Field(max_length=100)] = []
    custom_fields: Annotated[list[CustomFieldIn], Field(max_length=30)] = []


class LineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


class CustomFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    value: str
    visible: bool


class TotalsOut(BaseModel):
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal


def _as_utc(value: datetime) -> str:
    # SQLite drops tz info on read; every stored timestamp is UTC.
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


UtcDatetime = Annotated[datetime, PlainSerializer(_as_utc, return_type=str, when_used="json")]


Status = Literal["draft", "sent", "paid"]


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: Literal["created", "edited_after_sent", "sent", "resent", "paid", "reopened"]
    detail: str
    created_at: UtcDatetime


class InvoiceOut(BaseModel):
    id: int
    number: str
    status: Status
    is_overdue: bool
    business_name: str
    business_email: str
    business_address: str
    customer_name: str
    customer_email: str
    customer_address: str
    issue_date: date
    due_date: date
    payment_terms_days: int | None
    notes: str
    discount: Decimal
    tax_rate: Decimal
    line_items: list[LineItemOut]
    custom_fields: list[CustomFieldOut]
    totals: TotalsOut
    sent_at: UtcDatetime | None
    last_sent_to: str
    changed_since_sent: bool
    paid_on: date | None
    events: list[EventOut]
    created_at: UtcDatetime
    updated_at: UtcDatetime


class InvoiceSummary(BaseModel):
    id: int
    number: str
    status: Status
    is_overdue: bool
    customer_name: str
    issue_date: date
    due_date: date
    total: Decimal
    sent_at: UtcDatetime | None
    paid_on: date | None
    updated_at: UtcDatetime


class MarkPaidIn(BaseModel):
    paid_on: date


class NextNumberOut(BaseModel):
    number: str


ListStatus = Literal["all", "draft", "outstanding", "overdue", "paid"]
SortField = Literal["number", "customer", "issue_date", "due_date", "status", "total", "updated_at"]


class InvoiceListQuery(BaseModel):
    """Unknown values are rejected, not ignored."""

    model_config = ConfigDict(extra="forbid")

    q: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    status: ListStatus = "all"
    sort: SortField = "issue_date"
    direction: Literal["asc", "desc"] = "desc"
    page: Annotated[int, Field(ge=1)] = 1
    page_size: Annotated[int, Field(ge=1, le=100)] = 20


class InvoicePage(BaseModel):
    items: list[InvoiceSummary]
    total: int
    # Sum of every matching invoice, not just this page.
    total_amount: Decimal
    page: int
    page_size: int
    pages: int


class Bucket(BaseModel):
    count: int
    total: Decimal


class StatusCounts(BaseModel):
    all: int
    draft: int
    outstanding: int
    overdue: int
    paid: int


class InvoiceStats(BaseModel):
    as_of: date
    outstanding: Bucket
    overdue: Bucket
    paid_this_month: Bucket
    drafts: Bucket
    counts: StatusCounts
