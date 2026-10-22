"""Invoice arithmetic. All amounts are USD Decimals, rounded half up to cents.

Order of operations (from the brief):
  1. each line total = quantity x unit price, rounded to cents
  2. subtotal = sum of line totals
  3. subtract the fixed discount
  4. tax = (subtotal - discount) x rate, rounded to cents
  5. total = subtotal - discount + tax
"""

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def to_cents(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


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
