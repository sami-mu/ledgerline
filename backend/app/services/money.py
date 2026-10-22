"""Invoice math in Decimals. Lines are rounded to cents, then tax on (subtotal - discount)."""

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def to_cents(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def to_minor(amount: Decimal) -> int:
    """Dollars to whole cents: Decimal("12.34") -> 1234."""
    return int(to_cents(amount) * 100)


def from_minor(cents: int) -> Decimal:
    """Whole cents to dollars: 1234 -> Decimal("12.34")."""
    return (Decimal(cents) / 100).quantize(CENT)


def line_total(quantity: Decimal, unit_price: Decimal) -> Decimal:
    return to_cents(quantity * unit_price)


@dataclass(frozen=True)
class Totals:
    subtotal: Decimal
    discount: Decimal
    taxable: Decimal
    tax: Decimal
    total: Decimal


def subtotal_of(lines: Iterable[tuple[Decimal, Decimal]]) -> Decimal:
    return sum((line_total(qty, price) for qty, price in lines), ZERO)


def compute_totals(
    lines: Iterable[tuple[Decimal, Decimal]], discount: Decimal, tax_rate_percent: Decimal
) -> Totals:
    subtotal = subtotal_of(lines)
    discount = to_cents(discount)
    taxable = subtotal - discount
    tax = to_cents(taxable * tax_rate_percent / Decimal(100))
    return Totals(
        subtotal=subtotal,
        discount=discount,
        taxable=taxable,
        tax=tax,
        total=taxable + tax,
    )
