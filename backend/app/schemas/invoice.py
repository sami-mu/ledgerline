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

# Shared field types. Limits match the frontend Zod schema in src/features/invoice/schema.ts.
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


class InvoiceOut(BaseModel):
    id: int
    number: str
    status: Literal["draft", "sent"]
    business_name: str
    business_email: str
    business_address: str
    customer_name: str
    customer_email: str
    customer_address: str
    issue_date: date
    due_date: date
    notes: str
    discount: Decimal
    tax_rate: Decimal
    line_items: list[LineItemOut]
    custom_fields: list[CustomFieldOut]
    totals: TotalsOut
    sent_at: UtcDatetime | None
    last_sent_to: str
    created_at: UtcDatetime
    updated_at: UtcDatetime


class InvoiceSummary(BaseModel):
    id: int
    number: str
    status: Literal["draft", "sent"]
    customer_name: str
    issue_date: date
    due_date: date
    total: Decimal
    updated_at: UtcDatetime


class NextNumberOut(BaseModel):
    number: str
